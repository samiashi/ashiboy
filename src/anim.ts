import type { Transition, Variants } from 'motion/react';

/**
 * Shared motion language. Springs for anything tactile, short fades for
 * screen swaps, stagger for lists. transform/opacity only (GPU-friendly).
 * Respects the OS reduced-motion setting via MotionConfig in main.tsx.
 */

/** Snappy press feedback and small UI motion. */
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 32 };

/** Gentle entrances for cards and screens. */
export const springGentle: Transition = { type: 'spring', stiffness: 230, damping: 27 };

/** Fast screen swap (exits run ~20% faster via AnimatePresence defaults). */
export const screenSwap: Transition = { duration: 0.22, ease: 'easeOut' };

/** Fade-and-rise entrance for single elements. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springGentle },
};

/** Pop entrance for badges, avatars, stamps. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: springSnappy },
};

/** Parent that staggers any children using item variants. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
