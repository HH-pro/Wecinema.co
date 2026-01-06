import { useEffect, useRef } from "react";

const TouchCursor = () => {
  const circle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!circle.current) return;

      circle.current.style.left = `${e.clientX}px`;
      circle.current.style.top = `${e.clientY}px`;
    };

    const down = () => {
      circle.current?.classList.add("active");
    };

    const up = () => {
      circle.current?.classList.remove("active");
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return <div ref={circle} className="touch-circle" />;
};

export default TouchCursor;
