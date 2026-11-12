/** Same-origin height synchronization for the public workspace demonstration. */
(function () {
  'use strict';
  const frame = document.getElementById('npi-experience-iframe');
  if (!frame) return;
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== 'novapharm-workspaces-height' || !Number.isFinite(data.height)) return;
    const height = Math.max(550, Math.min(2700, Math.ceil(data.height) + 20));
    frame.style.height = height + 'px';
  });
})();
