/** Recover only a transient Lighthouse trace failure, never a scored audit.
 *
 * Each accepted Lighthouse profile still needs its full three valid scored
 * trials. Only NO_NAVSTART may receive one additional attempt. All other
 * Lighthouse failures and persistent NO_NAVSTART must remain release failures.
 */
export async function runLighthouseWithNavigationRetry(invoke, label) {
  if (typeof invoke !== "function" || typeof label !== "string" || !label) {
    throw new TypeError("A labelled Lighthouse invocation is required");
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await invoke();
    if (!result) throw new Error(`Lighthouse returned no result for ${label}.`);
    const error = result.lhr?.runtimeError;
    if (!error) return result;
    if (error.code === "NO_NAVSTART" && attempt === 1) {
      console.warn(`${label}: Lighthouse failed to capture navigation start; retrying this trace once.`);
      continue;
    }
    throw new Error(`${label}: ${error.message || error.code || "Lighthouse runtime error"}`);
  }
  throw new Error(`${label}: bounded Lighthouse trace retry exhausted.`);
}
