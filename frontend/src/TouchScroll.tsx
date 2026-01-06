import { useEffect, useRef } from "react";

const TouchScroll = () => {
  const isDown = useRef(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      isDown.current = true;
      startY.current = e.clientY;
      scrollTop.current = window.scrollY;
    };

    const onMove = (e: MouseEvent) => {
      if (!isDown.current) return;
      e.preventDefault();

      const y = e.clientY;
      const walk = startY.current - y; // drag distance
      window.scrollTo({
        top: scrollTop.current + walk,
      });
    };

    const onUp = () => {
      isDown.current = false;
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return null;
};

export default TouchScroll;
