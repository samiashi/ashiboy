import React from 'react';

/**
 * Test double for `motion/react`, wired via `test.alias` in vite.config.ts.
 *
 * motion-dom drives animations through the Web Animations API, which
 * happy-dom only partially implements — real motion components flood the run
 * with unhandled rejections. UI tests assert structure and behavior, never
 * animation physics, so this renders every motion component as its plain DOM
 * tag with all motion-specific props stripped.
 */

export type Transition = Record<string, unknown>;
export type Variants = Record<string, unknown>;

const STRIP = new Set([
  'initial',
  'animate',
  'exit',
  'variants',
  'transition',
  'transformTemplate',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'whileDrag',
  'onHoverStart',
  'onHoverEnd',
  'onTap',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onViewportEnter',
  'onViewportLeave',
  'layout',
  'layoutId',
  'layoutDependency',
  'layoutScroll',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragTransition',
  'dragListener',
  'dragControls',
  'viewport',
]);

function stripProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!STRIP.has(key)) out[key] = props[key];
  }
  return out;
}

const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();

function factory(tag: string): React.ComponentType<Record<string, unknown>> {
  const Stub = React.forwardRef<HTMLElement, Record<string, unknown>>(
    function MotionStub(props, ref) {
      const { children, ...rest } = props as Record<string, unknown> & {
        children?: React.ReactNode;
      };
      return React.createElement(tag, { ...stripProps(rest), ref }, children);
    },
  );
  Stub.displayName = `motion.${tag}`;
  return Stub as React.ComponentType<Record<string, unknown>>;
}

const motionProxy: Record<string, React.ComponentType<Record<string, unknown>>> = new Proxy(
  {},
  {
    get: (_target, tag: string) => {
      if (tag === '__esModule') return true;
      let component = cache.get(tag);
      if (!component) {
        component = factory(tag);
        cache.set(tag, component);
      }
      return component;
    },
  },
);

// NOTE: `motion` is intentionally NOT exported — production uses the lighter
// `m` (LazyMotion/domAnimation subset), and tests should fail if `motion`
// sneaks back in.
export const m = motionProxy;

export function AnimatePresence({ children }: { children?: React.ReactNode }): React.ReactNode {
  return React.createElement(React.Fragment, null, children);
}

export function MotionConfig({ children }: { children?: React.ReactNode }): React.ReactNode {
  return React.createElement(React.Fragment, null, children);
}

export function LazyMotion({ children }: { children?: React.ReactNode }): React.ReactNode {
  return React.createElement(React.Fragment, null, children);
}

export const domAnimation = {};

export function useReducedMotion(): boolean {
  return false;
}
