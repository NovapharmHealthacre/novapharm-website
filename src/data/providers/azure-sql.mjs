import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sqlScope = "https://database.windows.net/.default";
const refreshWindowMs = 5 * 60 * 1000;

function identifier(value) {
  const candidate = String(value || "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(candidate)) throw new Error("Unsafe database identifier.");
  return `[${candidate}]`;
}

function normaliseValue(value) {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

function portableSql(source) {
  let index = 0;
  let sql = String(source).replace(/\?/g, () => `@p${index++}`);
  sql = sql
    .replace(/date\('now',\s*'-12 months'\)/gi, "DATEADD(month, -12, CAST(SYSUTCDATETIME() AS date))")
    .replace(/date\('now'\)/gi, "CAST(SYSUTCDATETIME() AS date)");

  const parameterLimit = sql.match(/\s+LIMIT\s+(@p\d+)\s*;?\s*$/i);
  const literalLimit = sql.match(/\s+LIMIT\s+(\d+)\s*;?\s*$/i);
  if (parameterLimit) {
    sql = sql.replace(parameterLimit[0], ` OFFSET 0 ROWS FETCH NEXT ${parameterLimit[1]} ROWS ONLY`);
  } else if (literalLimit) {
    const count = Number(literalLimit[1]);
    sql = sql.replace(literalLimit[0], "");
    if (/\bORDER\s+BY\b/i.test(sql)) sql += ` OFFSET 0 ROWS FETCH NEXT ${count} ROWS ONLY`;
    else sql = sql.replace(/^\s*SELECT\s+/i, `SELECT TOP (${count}) `);
  }
  return sql;
}

function isRetryable(error) {
  return ["ESOCKET", "ETIMEOUT", "ECONNCLOSED", "ELOGIN"].includes(error?.code) ||
    /token|transport-level|connection is closed|service is busy/i.test(String(error?.message || ""));
}

export class AzureSqlProvider {
  constructor(environment = process.env) {
    this.environment = environment;
    this.server = String(environment.AZURE_SQL_SERVER || "").trim();
    this.database = String(environment.AZURE_SQL_DATABASE || "").trim();
    this.connectionString = String(environment.AZURE_SQL_CONNECTION_STRING || "").trim();
    this.pool = null;
    this.poolTokenExpiresAt = 0;
    this.driver = null;
    this.credential = null;
    this.raw = null;
  }

  async initialize() {
    if (!this.connectionString && (!this.server || !this.database)) {
      throw new Error("AZURE_SQL_SERVER and AZURE_SQL_DATABASE are required when DATABASE_PROVIDER=azure-sql.");
    }
    this.driver = (await import("mssql")).default;
    if (!this.connectionString) {
      const { DefaultAzureCredential } = await import("@azure/identity");
      this.credential = new DefaultAzureCredential();
    }
    await this.#ensurePool();
    if (this.environment.AZURE_SQL_RUN_MIGRATIONS === "true") await this.#migrate();
    else await this.#assertSchemaCurrent();
  }

  async #configuration() {
    if (this.connectionString) return this.connectionString;
    const token = await this.credential.getToken(sqlScope);
    if (!token?.token) throw new Error("Azure managed identity did not return an Azure SQL access token.");
    this.poolTokenExpiresAt = Number(token.expiresOnTimestamp || Date.now() + 30 * 60 * 1000);
    return {
      server: this.server,
      database: this.database,
      port: Number(this.environment.AZURE_SQL_PORT || 1433),
      authentication: {
        type: "azure-active-directory-access-token",
        options: { token: token.token }
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
      },
      pool: {
        max: Number(this.environment.DATABASE_POOL_MAX || 10),
        min: Number(this.environment.DATABASE_POOL_MIN || 0),
        idleTimeoutMillis: Number(this.environment.DATABASE_POOL_IDLE_MS || 30000)
      },
      connectionTimeout: Number(this.environment.DATABASE_CONNECTION_TIMEOUT_MS || 15000),
      requestTimeout: Number(this.environment.DATABASE_REQUEST_TIMEOUT_MS || 30000)
    };
  }

  async #ensurePool({ force = false } = {}) {
    const tokenNeedsRefresh = !this.connectionString && this.poolTokenExpiresAt - Date.now() < refreshWindowMs;
    if (!force && this.pool?.connected && !tokenNeedsRefresh) return this.pool;
    if (this.pool) {
      try { await this.pool.close(); } catch { /* A failed pool is replaced below. */ }
    }
    this.pool = await new this.driver.ConnectionPool(await this.#configuration()).connect();
    this.raw = this.pool;
    return this.pool;
  }

  #request(executor, params) {
    const request = executor.request();
    params.map(normaliseValue).forEach((value, index) => request.input(`p${index}`, value));
    return request;
  }

  async #query(executor, sql, params = []) {
    return this.#request(executor, params).query(portableSql(sql));
  }

  async #withRetry(operation) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const pool = await this.#ensurePool({ force: attempt > 0 });
        return await operation(pool);
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempt === 2) throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 150 * (2 ** attempt)));
      }
    }
    throw lastError;
  }

  async all(sql, params = []) {
    return this.#withRetry(async (pool) => (await this.#query(pool, sql, params)).recordset || []);
  }

  async one(sql, params = []) {
    return (await this.all(sql, params))[0] || null;
  }

  async run(sql, params = []) {
    return this.#withRetry(async (pool) => {
      const result = await this.#query(pool, sql, params);
      return { changes: Number(result.rowsAffected?.reduce((sum, count) => sum + count, 0) || 0) };
    });
  }

  async transaction(work) {
    const pool = await this.#ensurePool();
    const transaction = new this.driver.Transaction(pool);
    await transaction.begin(this.driver.ISOLATION_LEVEL.SERIALIZABLE);
    const executor = {
      all: async (sql, params = []) => (await this.#query(transaction, sql, params)).recordset || [],
      one: async (sql, params = []) => (await executor.all(sql, params))[0] || null,
      run: async (sql, params = []) => {
        const result = await this.#query(transaction, sql, params);
        return { changes: Number(result.rowsAffected?.reduce((sum, count) => sum + count, 0) || 0) };
      },
      upsert: (table, values, conflictColumns, updateColumns = []) => this.#upsert(transaction, table, values, conflictColumns, updateColumns),
      insertIgnore: (table, values, conflictColumns) => this.#upsert(transaction, table, values, conflictColumns, [])
    };
    try {
      const result = await work(executor);
      await transaction.commit();
      return result;
    } catch (error) {
      try { await transaction.rollback(); } catch { /* Preserve the application error. */ }
      throw error;
    }
  }

  async #upsert(executor, table, values, conflictColumns, updateColumns = []) {
    const columns = Object.keys(values);
    const source = columns.map((column, index) => `@p${index} AS ${identifier(column)}`).join(", ");
    const match = conflictColumns.map((column) => `target.${identifier(column)} = source.${identifier(column)}`).join(" AND ");
    const update = updateColumns.length
      ? `WHEN MATCHED THEN UPDATE SET ${updateColumns.map((column) => `target.${identifier(column)} = source.${identifier(column)}`).join(", ")}`
      : "";
    const query = `MERGE ${identifier(table)} WITH (HOLDLOCK) AS target
      USING (SELECT ${source}) AS source ON ${match}
      ${update}
      WHEN NOT MATCHED THEN INSERT (${columns.map(identifier).join(", ")})
        VALUES (${columns.map((column) => `source.${identifier(column)}`).join(", ")});`;
    const result = await this.#query(executor, query, columns.map((column) => values[column]));
    return { changes: Number(result.rowsAffected?.reduce((sum, count) => sum + count, 0) || 0) };
  }

  async upsert(table, values, conflictColumns, updateColumns = []) {
    return this.#withRetry((pool) => this.#upsert(pool, table, values, conflictColumns, updateColumns));
  }

  async insertIgnore(table, values, conflictColumns) {
    return this.upsert(table, values, conflictColumns, []);
  }

  async #migrate() {
    await this.run(`IF OBJECT_ID(N'dbo.schema_migrations', N'U') IS NULL
      CREATE TABLE dbo.schema_migrations(version nvarchar(128) NOT NULL PRIMARY KEY, applied_at datetime2(3) NOT NULL);`);
    const directory = resolve(process.cwd(), "database", "azure");
    const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/i.test(file)).sort();
    for (const file of files) {
      if (await this.one("SELECT version FROM schema_migrations WHERE version = ?", [file])) continue;
      const source = await readFile(resolve(directory, file), "utf8");
      const batches = source.split(/^\s*GO\s*$/gim).map((batch) => batch.trim()).filter(Boolean);
      await this.transaction(async (transaction) => {
        for (const batch of batches) await transaction.run(batch);
        await transaction.run("INSERT INTO schema_migrations(version, applied_at) VALUES(?, SYSUTCDATETIME())", [file]);
      });
    }
  }

  async #assertSchemaCurrent() {
    const table = await this.one("SELECT CASE WHEN OBJECT_ID(N'dbo.schema_migrations', N'U') IS NULL THEN 0 ELSE 1 END AS value");
    if (Number(table?.value || 0) !== 1) {
      throw new Error("Azure SQL schema is not initialised. Run the controlled schema migration before starting the application.");
    }
    const directory = resolve(process.cwd(), "database", "azure");
    const expected = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/i.test(file)).sort();
    const applied = new Set((await this.all("SELECT version FROM schema_migrations")).map((row) => row.version));
    const missing = expected.filter((file) => !applied.has(file));
    if (missing.length) throw new Error(`Azure SQL schema migrations are pending: ${missing.join(", ")}`);
  }

  async ready() {
    try {
      return Number((await this.one("SELECT 1 AS value"))?.value || 0) === 1;
    } catch {
      return false;
    }
  }

  async close() {
    if (this.pool) await this.pool.close();
  }
}
