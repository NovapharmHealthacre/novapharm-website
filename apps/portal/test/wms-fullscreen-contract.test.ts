import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WMS full-screen is opt-in, browser-managed and reversible", () => {
  const source = readFileSync(new URL("../components/wms-capacity-scenario-studio.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/employee-distribution.css", import.meta.url), "utf8");
  assert.match(source, /document\.fullscreenEnabled/);
  assert.match(source, /requestFullscreen\(\)/);
  assert.match(source, /document\.exitFullscreen\(\)/);
  assert.match(source, /fullscreenchange/);
  assert.match(source, /aria-pressed=\{fullScreen\}/);
  assert.match(source, /Exit full screen/);
  assert.match(source, /role="alert"/);
  assert.match(source, /fullScreenSupported \?/);
  assert.match(styles, /distribution-wms-capacity-studio:fullscreen/);
});
