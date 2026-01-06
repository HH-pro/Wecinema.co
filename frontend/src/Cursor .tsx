import { useEffect, useRef } from "react";

const TouchCursor = () => {
  const circle = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 }); // initial center
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 }); // start from center
  const raf = useRef<number>();

  useEffect(() => {
    const speed = 0.08; // smooth & slow

    const move = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (circle.current) circle.current.style.opacity = "1";
    };

    const hide = (e: MouseEvent) => {
      if (!e.relatedTarget && circle.current) circle.current.style.opacity = "0";
    };

    const animate = () => {
      // Lerp / Smooth follow
      pos.current.x += (mouse.current.x - pos.current.x) * speed;
      pos.current.y += (mouse.current.y - pos.current.y) * speed;

      if (circle.current)
        circle.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;

      raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseout", hide);

    // Initialize circle at mouse start position
    if (circle.current) {
      circle.current.style.left = `${mouse.current.x}px`;
      circle.current.style.top = `${mouse.current.y}px`;
    }

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseout", hide);
      cancelAnimationFrame(raf.current!);
    };
  }, []);

  return <div ref={circle} className="touch-circle" />;
};

export default TouchCursor;
