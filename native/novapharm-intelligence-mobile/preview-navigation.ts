/** Private Expo navigation policy. No network, session, or release activation. */
export const moreDetailScreens: ReadonlySet<string> = new Set([
  "countries", "review", "research", "inspect", "maps", "visual",
  "science", "account", "customer-portal-preview", "distribution-preview"
]);

/** Return null to let Android handle Back normally on a top-level tab. */
export function mobileBackDestination(
  screen: string,
  hasWorkspaceDetail: boolean
): "workspaces" | "more" | null {
  if (screen === "workspaces" && hasWorkspaceDetail) return "workspaces";
  if (moreDetailScreens.has(screen)) return "more";
  return null;
}
