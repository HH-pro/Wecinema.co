import { useEffect, useRef } from "react";

const TouchCursor = () => {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dot.current || !ring.current) return;

      dot.current.style.left = `${e.clientX}px`;
      dot.current.style.top = `${e.clientY}px`;

      ring.current.animate(
        {
          left: `${e.clientX}px`,
          top: `${e.clientY}px`,
        },
        { duration: 120, fill: "forwards" }
      );
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <>
      <div ref={dot} className="touch-dot" />
      <div ref={ring} className="touch-ring" />
    </>
  );
};

export default TouchCursor;
