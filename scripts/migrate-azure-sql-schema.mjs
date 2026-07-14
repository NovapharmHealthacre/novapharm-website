process.env.DATABASE_PROVIDER = "azure-sql";
process.env.AZURE_SQL_RUN_MIGRATIONS = "true";

const { closeDatabase, databaseReady } = await import("../src/data/database.mjs");

try {
  if (!await databaseReady()) throw new Error("Azure SQL did not report ready after schema migration.");
  console.log("Azure SQL schema migrations completed and readiness was verified.");
} finally {
  await closeDatabase();
}
