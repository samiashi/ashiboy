import { useState } from 'react';
import { m } from 'motion/react';
import type { StoredSession } from '@/games/mafia/net/persistence';
import { fadeUp, popIn, staggerParent } from '@/anim';
import { AVATARS, randomAvatar } from '@/games/mafia/ui/avatars';
import HowToPlay from '@/games/mafia/ui/HowToPlay';

interface Props {
  connecting: boolean;
  error: string | null;
  prefillCode: string;
  prefillName: string;
  prefillAvatar: string;
  session: StoredSession | null;
  onCreate(name: string, avatar: string): void;
  onJoin(code: string, name: string, avatar: string): void;
  onRejoin(session: StoredSession): void;
  onForgetSession(): void;
}

export default function Home({
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
}: Props) {
  const [name, setName] = useState(prefillName);
  const [avatar, setAvatar] = useState(prefillAvatar || randomAvatar());
  const [code, setCode] = useState(prefillCode);
  const nameOk = name.trim().length > 0;

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
          Mafia
        </m.h1>
        <m.p className="muted center" variants={fadeUp}>
          A game of hidden identity and deception. This app replaces the moderator — everyone gets
          to play.
        </m.p>

        <m.input
          className="input"
          placeholder="Your name"
          value={name}
          maxLength={20}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          variants={fadeUp}
        />

        <m.p className="muted picker-label center" variants={fadeUp}>
          Pick your avatar
        </m.p>
        <m.div className="avatar-grid" variants={staggerParent}>
          {AVATARS.map((a) => (
            <m.button
              key={a}
              className={`avatar-option${avatar === a ? ' avatar-selected' : ''}`}
              onClick={() => setAvatar(a)}
              aria-label={`avatar ${a}`}
              variants={popIn}
              whileTap={{ scale: 0.88 }}
            >
              {a}
            </m.button>
          ))}
        </m.div>

        <m.button
          className="btn btn-primary"
          disabled={!nameOk || connecting}
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
            value={code}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <m.button
            className="btn"
            disabled={!nameOk || code.trim().length !== 6 || connecting}
            onClick={() => onJoin(code.trim(), name, avatar)}
            whileTap={{ scale: 0.95 }}
          >
            Join
          </m.button>
        </m.div>

        {error && <p className="error">{error}</p>}
        <a className="back-link" href="#/">
          ← All games
        </a>
      </m.div>

      <HowToPlay />
    </div>
  );
}
