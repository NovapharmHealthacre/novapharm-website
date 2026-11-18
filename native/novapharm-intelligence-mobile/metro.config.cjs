// Expo SDK 58; project is intentionally outside root npm/pnpm workspaces.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repositoryRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), repositoryRoot]));
module.exports = config;
