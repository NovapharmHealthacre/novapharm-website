/**
 * A fresh Chromium trace may occasionally omit navigationStart (NO_NAVSTART).
 * Retry this one telemetry-initialisation fault once, never a failed audit
 * score, real navigation error, security assertion or runtime exception.
 */
export async function withTransientLighthouseNavRetry(run, { onRetry = async () => {} } = {}) {
  if (typeof run !== "function" || typeof onRetry !== "function") {
    throw new TypeError("A Lighthouse audit and optional retry hook are required.");
  }
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof Error) || !/\bNO_NAVSTART\b/u.test(error.message)) throw error;
    await onRetry();
    // A second failure propagates. No unbounded retry, silent success or
    // weakened score/accessibility/security threshold is permitted.
    return run();
  }
}
