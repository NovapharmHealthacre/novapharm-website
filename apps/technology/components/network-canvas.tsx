"use client";

import { useEffect, useRef } from "react";

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
};

export function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let animation = 0;
    let nodes: Node[] = [];
    const pointer = { x: -1000, y: -1000 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(28, Math.min(68, Math.floor((width * height) / 18000)));
      nodes = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: index % 9 === 0 ? 2.3 : 1.2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      frame += 1;
      context.clearRect(0, 0, width, height);

      const gradient = context.createRadialGradient(width * 0.72, height * 0.42, 0, width * 0.72, height * 0.42, Math.max(width, height) * 0.68);
      gradient.addColorStop(0, "rgba(183, 33, 45, 0.12)");
      gradient.addColorStop(0.55, "rgba(183, 33, 45, 0.025)");
      gradient.addColorStop(1, "rgba(183, 33, 45, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      for (const node of nodes) {
        if (!media.matches) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < -20) node.x = width + 20;
          if (node.x > width + 20) node.x = -20;
          if (node.y < -20) node.y = height + 20;
          if (node.y > height + 20) node.y = -20;
        }
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        if (!a) continue;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 145) {
            context.beginPath();
            context.strokeStyle = `rgba(255,255,255,${0.11 * (1 - distance / 145)})`;
            context.lineWidth = 0.7;
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      const signalIndex = Math.floor(frame / 95) % Math.max(nodes.length, 1);
      nodes.forEach((node, index) => {
        const pointerDistance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
        const isSignal = index === signalIndex;
        const pulse = 0.5 + Math.sin(frame * 0.025 + node.phase) * 0.5;
        context.beginPath();
        context.fillStyle = isSignal
          ? `rgba(239, 74, 82, ${0.72 + pulse * 0.28})`
          : pointerDistance < 120
            ? "rgba(255,255,255,0.82)"
            : "rgba(255,255,255,0.42)";
        context.arc(node.x, node.y, isSignal ? node.radius + 2.2 + pulse * 1.5 : node.radius, 0, Math.PI * 2);
        context.fill();
      });

      if (!media.matches) animation = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -1000;
      pointer.y = -1000;
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    const onPreference = () => {
      window.cancelAnimationFrame(animation);
      draw();
    };
    media.addEventListener("change", onPreference);

    return () => {
      window.cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      media.removeEventListener("change", onPreference);
    };
  }, []);

  return (
    <div className="network-canvas" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
