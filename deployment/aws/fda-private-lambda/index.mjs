// Root entry used ONLY inside the FDA private Lambda ZIP, never by the website.
// The build script copies this file to ZIP root as index.mjs.
export { handler } from "./src/core/regulatory/fda-aws-lambda-entry.mjs";
