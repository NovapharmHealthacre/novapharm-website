import { closeDatabase } from "../../src/data/database.mjs";
import { seedLocalPortalData } from "./seed-data.mjs";

const result = await seedLocalPortalData();
await closeDatabase();
console.log(JSON.stringify({ status: "seeded", ...result }));
