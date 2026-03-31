import { useEffect, useRef, memo } from 'react';

/**
 * A single <canvas> starfield that replaces the 100-150 individually
 * animated DOM nodes previously rendered inside each page.
 *
 * Benefits:
 *  - 1 DOM node vs. 100-150
 *  - GPU-composited canvas vs. per-element CSS animation
 *  - requestAnimationFrame-driven: automatically pauses when tab is hidden
 *  - ~50 stars is visually identical to 120 at normal screen sizes
 */
const StarfieldCanvas = memo(({ count = 50, opacity = 0.6 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let stars = [];

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // Re-seed stars on resize
      stars = Array.from({ length: count }, () => ({
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height,
        r:    Math.random() * 1.2 + 0.3,
        // twinkle phase offset and speed
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.015 + 0.008,
        base:  Math.random() * 0.4 + 0.2,
      }));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (ts) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = ts * 0.001;
      for (const s of stars) {
        const alpha = s.base + Math.sin(t * (s.speed * 60) + s.phase) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, alpha))})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity }}
    />
  );
});

StarfieldCanvas.displayName = 'StarfieldCanvas';
export default StarfieldCanvas;
