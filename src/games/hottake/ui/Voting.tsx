import { useCallback } from 'react';
import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/hottake/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { playSound } from '@/games/hottake/sound';
import { CountdownRing } from '@/shared/components/CountdownRing';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

/** Anonymous ballot — vote the funniest (never your own). */
export default function Voting({ view, send }: Props) {
  const connected = view.players.filter((p) => p.connected);
  const voted = (view.voterIds ?? []).length;
  // Stable identities so CountdownRing effects don't resubscribe every render.
  const handleExpire = useCallback(() => playSound('time'), []);
  const handleTick = useCallback(() => playSound('tick'), []);

  return (
    <div className="app">
      <m.div
        className="prompt-banner"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="eyebrow">
          Prompt {view.promptNumber} of {view.promptsTotal} — vote
        </p>
        <p className="prompt-text">{view.promptText}</p>
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Anonymous ballot ({voted}/{connected.length} voted)
        </m.h2>
        <div className="ballot-list">
          {(view.ballot ?? []).map((item) => {
            const mine = view.myVote === item.seat;
            return (
              <m.button
                key={item.seat}
                type="button"
                className={`ballot-btn${mine ? ' ballot-mine' : ''}`}
                aria-pressed={mine}
                aria-label={`Vote for: ${item.text}`}
                onClick={() => send({ t: 'vote', seat: item.seat })}
                variants={fadeUp}
                whileTap={{ scale: 0.97 }}
              >
                {item.text}
              </m.button>
            );
          })}
        </div>
        <m.p className="muted center" variants={fadeUp}>
          {view.myVote === null || view.myVote === undefined
            ? 'Tap the funniest — you can change your mind until voting closes.'
            : 'Vote locked in — tap another to switch.'}
        </m.p>
        {view.me.isHost && (
          <m.button
            className="btn btn-ghost"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Close voting
          </m.button>
        )}
      </m.div>

      {view.voteEndsAt !== undefined && (
        <CountdownRing
          key={view.voteEndsAt}
          endsAt={view.voteEndsAt}
          totalSeconds={view.voteDurationSec ?? 0}
          size={104}
          onExpire={handleExpire}
          onTick={handleTick}
        />
      )}
    </div>
  );
}
