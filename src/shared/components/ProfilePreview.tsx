import { m } from 'motion/react';
import { fadeUp, springSnappy } from '@/anim';

interface Props {
  avatar: string;
  name: string;
}

/** Live "this is you" card — avatar pops on every change. */
export function ProfilePreview({ avatar, name }: Props) {
  return (
    <m.div className="profile-preview" variants={fadeUp} aria-live="polite">
      <m.span
        key={avatar}
        className="profile-preview-avatar"
        initial={{ scale: 0.5, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={springSnappy}
      >
        {avatar}
      </m.span>
      <span className="profile-preview-name">{name.trim() || 'Your name'}</span>
    </m.div>
  );
}
