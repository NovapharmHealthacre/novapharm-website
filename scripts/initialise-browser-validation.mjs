if (process.env.BROWSER_VALIDATION_MODE !== "true" || process.env.NODE_ENV === "production" || process.env.HOST !== "127.0.0.1") {
  throw new Error("Browser validation initialisation requires the isolated localhost validation environment.");
}

await import("../server.mjs");
const { closeDatabase } = await import("../src/data/database.mjs");
await closeDatabase();
console.log(JSON.stringify({ status: "initialised", credentials: "protected_synthetic_identity" }));
