import { useEffect, useRef } from "react";

const TouchCursor = () => {
  const circle = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const raf = useRef<number>();

  useEffect(() => {
    const speed = 0.08; // Lower = smoother

    const move = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      // Cursor always visible when inside viewport
      if (circle.current) circle.current.style.opacity = "1";
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

    // Remove problematic mouseout listener
    // document.addEventListener("mouseout", hideIfOutside); // ❌ Not needed

    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf.current!);
    };
  }, []);

  return <div ref={circle} className="touch-circle" />;
};

export default TouchCursor;
