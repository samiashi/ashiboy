import { m } from 'motion/react';
import { popIn, staggerParent } from '@/anim';
import { AVATARS } from '@/shared/avatars';

interface Props {
  value: string;
  onChange(avatar: string): void;
}

/** Emoji avatar grid with springy selection. */
export function AvatarPicker({ value, onChange }: Props) {
  return (
    <m.div className="avatar-grid" variants={staggerParent}>
      {AVATARS.map((a) => (
        <m.button
          key={a}
          className={`avatar-option${value === a ? ' avatar-selected' : ''}`}
          onClick={() => onChange(a)}
          aria-label={`avatar ${a}`}
          aria-pressed={value === a}
          variants={popIn}
          whileTap={{ scale: 0.88 }}
        >
          {a}
        </m.button>
      ))}
    </m.div>
  );
}
