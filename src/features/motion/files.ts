export const motionMainComponent = `'use client';

import { domAnimation, LazyMotion, m, useReducedMotion, type HTMLMotionProps } from 'motion/react';

type MotionMainProps = Omit<
  HTMLMotionProps<'main'>,
  | 'animate'
  | 'exit'
  | 'initial'
  | 'layout'
  | 'layoutId'
  | 'transition'
  | 'variants'
  | 'whileDrag'
  | 'whileFocus'
  | 'whileHover'
  | 'whileInView'
  | 'whileTap'
>;

export function MotionMain({ children, ...props }: MotionMainProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.main
        {...props}
        data-motion-root=""
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.2, ease: 'easeOut' }
        }
      >
        {children}
      </m.main>
    </LazyMotion>
  );
}
`;

export function renderMotionMainUnitTest(importAlias = '@/') {
  return `import { render } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const motionState = vi.hoisted(() => ({
  reduced: false,
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock('motion/react', () => ({
  domAnimation: {},
  LazyMotion: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  m: {
    main: ({
      children,
      ...props
    }: {
      children?: ReactNode;
    } & Record<string, unknown>) => {
      motionState.props = props;
      return createElement('main', null, children);
    },
  },
  useReducedMotion: () => motionState.reduced,
}));

import { MotionMain } from '${importAlias}components/common/motion-main';

describe('MotionMain', () => {
  beforeEach(() => {
    motionState.reduced = false;
    motionState.props = undefined;
  });

  it('uses a restrained entrance animation', () => {
    render(<MotionMain>Content</MotionMain>);

    expect(motionState.props).toMatchObject({
      'data-motion-root': '',
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2, ease: 'easeOut' },
    });
  });

  it('removes movement and duration when reduced motion is requested', () => {
    motionState.reduced = true;

    render(<MotionMain>Content</MotionMain>);

    expect(motionState.props).toMatchObject({
      initial: false,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    });
  });
});
`;
}
