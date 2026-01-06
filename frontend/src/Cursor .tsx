import { useEffect, useRef } from "react";

const TouchCursor = () => {
  const circle = useRef<HTMLDivElement>(null);

  // Mouse position
  const mouse = useRef({ x: 0, y: 0 });

  // Current circle position
  const pos = useRef({ x: 0, y: 0 });

  const raf = useRef<number>();

  useEffect(() => {
    const speed = 0.08; // Lower = smoother, no jump

    // Initialize cursor at current mouse position
    const init = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      pos.current.x = e.clientX;
      pos.current.y = e.clientY;

      if (circle.current) {
        circle.current.style.left = `${e.clientX}px`;
        circle.current.style.top = `${e.clientY}px`;
        circle.current.style.opacity = "1";
      }

      window.removeEventListener("mousemove", init);
    };

    window.addEventListener("mousemove", init, { once: true });

    const move = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (circle.current) circle.current.style.opacity = "1";
    };

    const animate = () => {
      // Smooth lerp
      const dx = mouse.current.x - pos.current.x;
      const dy = mouse.current.y - pos.current.y;

      // Optional clamp to avoid overshoot
      const maxDelta = 100; // max pixels per frame
      const deltaX = Math.abs(dx) > maxDelta ? Math.sign(dx) * maxDelta : dx;
      const deltaY = Math.abs(dy) > maxDelta ? Math.sign(dy) * maxDelta : dy;

      pos.current.x += deltaX * speed;
      pos.current.y += deltaY * speed;

      if (circle.current) {
        circle.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }

      raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);

    window.addEventListener("mousemove", move);

    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf.current!);
    };
  }, []);

  return <div ref={circle} className="touch-circle" />;
};

export default TouchCursor;
