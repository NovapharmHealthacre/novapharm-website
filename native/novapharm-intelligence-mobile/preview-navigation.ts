/** Private Expo navigation policy. No network, session, or release activation. */
export const moreDetailScreens: ReadonlySet<string> = new Set([
  "countries", "fda", "review", "research", "inspect", "maps", "visual",
  "science", "account", "customer-portal-preview", "distribution-preview"
]);

export const operationsDetailScreens: ReadonlySet<string> = new Set([
  "customer-portal-preview", "distribution-preview"
]);

/** Return null to let Android handle Back normally on a top-level tab. */
export function mobileBackDestination(
  screen: string,
  hasWorkspaceDetail: boolean,
  hasOperationsDetail = false
): "workspaces" | "more" | "operations-module-list" | null {
  if (screen === "workspaces" && hasWorkspaceDetail) return "workspaces";
  if (operationsDetailScreens.has(screen) && hasOperationsDetail) return "operations-module-list";
  if (moreDetailScreens.has(screen)) return "more";
  return null;
}
