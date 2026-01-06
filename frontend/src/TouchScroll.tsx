import { useEffect, useRef } from "react";

const TouchScroll = () => {
  const isDown = useRef(false);
  const startY = useRef(0);
  const scrollStart = useRef(0);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      isDown.current = true;
      startY.current = e.clientY;
      scrollStart.current = window.scrollY;
      document.body.style.userSelect = "none"; // prevent text selection
    };

    const onMove = (e: MouseEvent) => {
      if (!isDown.current) return;

      const deltaY = startY.current - e.clientY;
      window.scrollTo({ top: scrollStart.current + deltaY });
    };

    const onUp = () => {
      isDown.current = false;
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onUp); // fixes stuck if mouse leaves window

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onUp);
    };
  }, []);

  return null;
};

export default TouchScroll;
