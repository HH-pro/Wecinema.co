import { useEffect, useRef } from "react";
import "./index.css"; // CSS for cursor

const TouchCursor = () => {
  const circle = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef<number>();

  useEffect(() => {
    const speed = 0.2; // lower = smoother

    const move = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (circle.current) circle.current.style.opacity = "1";
    };

    const hide = () => {
      if (circle.current) circle.current.style.opacity = "0";
    };

    const animate = () => {
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

export default TouchCursor;
