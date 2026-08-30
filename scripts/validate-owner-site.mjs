// Owner release validation now uses the canonical site validator directly.
// Retired public AI/search routes and current product routes are governed in
// that source, avoiding a generated validator that can drift from the build.
await import("./validate-site.mjs");
