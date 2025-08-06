import { Variants } from "framer-motion";

export const staggerContainer = (staggerChildren?: number, delayChildren?: number): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: staggerChildren || 0.1,
      delayChildren: delayChildren || 0,
    },
  },
});

export const fadeIn = (
  direction: 'up' | 'down' | 'left' | 'right',
  type: string,
  delay: number,
  duration: number
): Variants => ({
  hidden: {
    x: direction === 'left' ? 100 : direction === 'right' ? -100 : 0,
    y: direction === 'up' ? 100 : direction === 'down' ? -100 : 0,
    opacity: 0,
  },
  show: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: {
      type: type || 'spring',
      delay: delay || 0,
      duration: duration || 1,
      ease: 'easeOut',
    },
  },
});

export const zoomIn = (delay: number, duration: number): Variants => ({
  hidden: {
    scale: 0.5,
    opacity: 0,
  },
  show: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      delay: delay || 0,
      duration: duration || 0.75,
      ease: 'easeOut',
    },
  },
});

export const slideIn = (
  direction: 'left' | 'right' | 'up' | 'down',
  type: string,
  delay: number,
  duration: number
): Variants => ({
  hidden: {
    x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
    y: direction === 'up' ? '100%' : direction === 'down' ? '-100%' : 0,
  },
  show: {
    x: 0,
    y: 0,
    transition: {
      type: type || 'spring',
      delay: delay || 0,
      duration: duration || 0.5,
      ease: 'easeOut',
    },
  },
});