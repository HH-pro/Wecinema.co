import { useEffect, useRef } from "react";

const TouchCursor = () => {
  const circle = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef<number>();

  useEffect(() => {
    const speed = 0.20;

    const move = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (circle.current) {
        circle.current.style.opacity = "1";
      }
    };

    const hideIfOutside = (e: MouseEvent) => {
      // Only hide if actually leaving viewport
      if (!e.relatedTarget && circle.current) {
        circle.current.style.opacity = "0";
      }
    };

    const animate = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * speed;
      pos.current.y += (mouse.current.y - pos.current.y) * speed;

      if (circle.current) {
        circle.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }

      raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseout", hideIfOutside);

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseout", hideIfOutside);
      cancelAnimationFrame(raf.current!);
    };
  }, []);

  return <div ref={circle} className="touch-circle" />;
};

export default TouchCursor;
