import { useEffect, useState } from 'react';
import { m } from 'motion/react';
import type { RoomTicket } from '@/shared/identity';
import { fadeUp, popIn, staggerParent } from '@/anim';
import { randomAvatar } from '@/shared/avatars';
import { AvatarPicker } from '@/shared/components/AvatarPicker';
import { ProfilePreview } from '@/shared/components/ProfilePreview';

export interface GameHomeProps {
  title: string;
  tagline: string;
  /** Game-specific rules card rendered below the hero. */
  howToPlay: React.ReactNode;
  connecting: boolean;
  error: string | null;
  prefillCode: string;
  prefillName: string;
  prefillAvatar: string;
  session: RoomTicket | null;
  onCreate(name: string, avatar: string): void;
  onJoin(code: string, name: string, avatar: string): void;
  onRejoin(session: RoomTicket): void;
  onForgetSession(): void;
  onDismissError?(): void;
}

/**
 * The shared entry screen for every game: rejoin card, name + avatar
 * identity, create-vs-join (mutually exclusive), invite-code join.
 * Games supply only their words and their rules card.
 */
export function GameHome({
  title,
  tagline,
  howToPlay,
  connecting,
  error,
  prefillCode,
  prefillName,
  prefillAvatar,
  session,
  onCreate,
  onJoin,
  onRejoin,
  onForgetSession,
  onDismissError,
}: GameHomeProps) {
  const [name, setName] = useState(prefillName);
  const [avatar, setAvatar] = useState(() => prefillAvatar || randomAvatar());
  const [code, setCode] = useState(() => prefillCode.trim().toUpperCase());
  // A second invite pasted while already on this page must reach the form.
  useEffect(() => {
    setCode(prefillCode.trim().toUpperCase());
  }, [prefillCode]);
  const nameOk = name.trim().length > 0;
  // Creating and joining are mutually exclusive paths: typing a code (or
  // arriving with one from an invite link) means you're joining, not hosting.
  const joining = code.trim().length > 0;

  return (
    <div className="app">
      {session && (
        <m.div className="card rejoin-card" variants={popIn} initial="hidden" animate="show">
          <p className="muted center">You have a seat in an ongoing game</p>
          <button
            className="btn btn-primary"
            disabled={connecting}
            onClick={() => onRejoin(session)}
          >
            {connecting ? 'Reconnecting…' : `Rejoin as ${session.avatar} ${session.name}`}
          </button>
          <button className="btn btn-ghost btn-small" onClick={onForgetSession}>
            Dismiss
          </button>
        </m.div>
      )}

      <m.div
        className="card card-luxe hero"
        variants={staggerParent}
        initial="hidden"
        animate="show"
      >
        <m.p className="eyebrow center" variants={fadeUp}>
          The house presents
        </m.p>
        <m.h1 className="title title-shimmer" variants={fadeUp}>
          {title}
        </m.h1>
        <m.p className="muted center" variants={fadeUp}>
          {tagline}
        </m.p>

        <m.input
          className="input"
          placeholder="Your name"
          aria-label="Your name"
          value={name}
          maxLength={20}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          variants={fadeUp}
        />

        <m.p className="muted picker-label center" variants={fadeUp} id="avatar-label">
          Pick your avatar
        </m.p>
        <AvatarPicker value={avatar} onChange={setAvatar} />

        <ProfilePreview avatar={avatar} name={name} />

        <m.button
          className="btn btn-primary"
          disabled={!nameOk || connecting || joining}
          onClick={() => onCreate(name, avatar)}
          variants={fadeUp}
          whileTap={{ scale: 0.97 }}
        >
          {connecting ? 'Connecting…' : 'Create a game'}
        </m.button>

        <m.div className="divider" variants={fadeUp}>
          <span>or join a friend</span>
        </m.div>

        <m.div className="row" variants={fadeUp}>
          <input
            className="input code-input"
            placeholder="CODE"
            aria-label="Room code"
            value={code}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <m.button
            className="btn"
            disabled={!nameOk || code.trim().length !== 6 || connecting}
            onClick={() => onJoin(code.trim().toUpperCase(), name, avatar)}
            whileTap={{ scale: 0.95 }}
          >
            Join
          </m.button>
        </m.div>

        {error && (
          <p className="error" role="alert">
            {error}{' '}
            {onDismissError && (
              <button type="button" className="btn btn-ghost btn-mini" onClick={onDismissError}>
                Dismiss error
              </button>
            )}
          </p>
        )}
        <a className="back-link" href="#/">
          ← All games
        </a>
      </m.div>

      {howToPlay}
    </div>
  );
}
