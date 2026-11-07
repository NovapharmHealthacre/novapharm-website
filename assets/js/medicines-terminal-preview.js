/* NovaPharm Medicines Terminal concept: synthetic-only, local visual interaction.
   No network, identities, private data or external health data is accessed. */
(() => {
  "use strict";
  const preview = document.querySelector("[data-medicines-terminal-preview]");
  if (!preview) return;
  const canvas = preview.querySelector("[data-npi-chart]");
  const updateButton = preview.querySelector("[data-npi-update]");
  const status = preview.querySelector("[data-npi-status]");
  const controls = Array.from(preview.querySelectorAll("[data-npi-series]"));
  if (!(canvas instanceof HTMLCanvasElement) || !updateButton || !status || controls.length !== 4) return;
  const series = [
    { label: "North East", color: "#0055b7", values: [58, 60, 61, 63, 64, 66, 67, 69, 71, 74, 76, 79] },
    { label: "Midlands", color: "#3188ee", values: [43, 44, 45, 46, 47, 48, 49, 51, 52, 54, 56, 58] },
    { label: "London", color: "#7496ea", values: [30, 30, 32, 31, 33, 34, 34, 35, 36, 37, 39, 40] },
    { label: "South West", color: "#9ebcf3", values: [18, 19, 20, 19, 21, 22, 23, 24, 25, 25, 26, 27] }
  ];
  const selected = new Set([0, 1, 2, 3]);
  const draw = () => {
    const context = canvas.getContext("2d");
    if (!context) return;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(180, bounds.width || 500);
    const height = Math.max(100, bounds.height || 150);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const left = 2, right = width - 4, top = 5, bottom = height - 9;
    context.lineWidth = 1;
    context.strokeStyle = "#e8edf6";
    for (let i = 0; i <= 4; i++) {
      const y = top + (bottom - top) * i / 4;
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
    }
    context.strokeStyle = "#eff3f9";
    for (let i = 0; i < 12; i++) {
      const x = left + (right - left) * i / 11;
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();
    }
    const point = (index, value) => ({
      x: left + (right - left) * index / 11,
      y: bottom - (bottom - top) * value / 100
    });
    series.forEach(({ color, values }, seriesIndex) => {
      if (!selected.has(seriesIndex)) return;
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = 2.1;
      context.lineJoin = "round";
      context.lineCap = "round";
      values.forEach((value, index) => {
        const { x, y } = point(index, value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      values.forEach((value, index) => {
        const { x, y } = point(index, value);
        context.beginPath();
        context.fillStyle = color;
        context.arc(x, y, 2.2, 0, Math.PI * 2);
        context.fill();
      });
    });
  };
  updateButton.addEventListener("click", () => {
    selected.clear();
    controls.forEach((input, index) => {
      if (input.checked) selected.add(index);
    });
    const count = selected.size;
    status.textContent = count === 0 ? "Select a region to display a sample series" : count + " synthetic " + (count === 1 ? "series" : "series") + " shown";
    draw();
  });
  window.addEventListener("resize", draw, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
  }
  draw();
})();
