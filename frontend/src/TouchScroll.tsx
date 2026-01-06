import { useEffect, useRef } from "react";

// Smooth touch scroll
export const TouchScroll = () => {
  const isDown = useRef(false);
  const startY = useRef(0);
  const scrollStart = useRef(0);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      isDown.current = true;
      startY.current = e.clientY;
      scrollStart.current = window.scrollY;
      document.body.style.userSelect = "none";
    };

    const onMove = (e: MouseEvent) => {
      if (!isDown.current) return;
      const deltaY = (startY.current - e.clientY) * 0.5; // reduce speed for smoother scroll
      window.scrollTo({ top: scrollStart.current + deltaY, behavior: "auto" });
    };

    const onUp = () => {
      isDown.current = false;
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onUp);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onUp);
    };
  }, []);

  return null;
};

// Smooth cursor follow
export const TouchCursor = () => {
  const circle = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef<number>();

  useEffect(() => {
    const speed = 0.2; // smoother = lower

    const move = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (circle.current) circle.current.style.opacity = "1";
    };

    const hide = () => {
      if (circle.current) circle.current.style.opacity = "0";
    };

    const animate = () => {
      // only update if delta > 0.1px to reduce work
      const dx = mouse.current.x - pos.current.x;
      const dy = mouse.current.y - pos.current.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        pos.current.x += dx * speed;
        pos.current.y += dy * speed;
        if (circle.current) {
          circle.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
        }
      }
      raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", hide);
    document.addEventListener("mouseleave", hide);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseleave", hide);
      cancelAnimationFrame(raf.current!);
    };
  }, []);

  return <div ref={circle} className="touch-circle" />;
};
