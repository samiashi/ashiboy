import { useCallback } from 'react';
import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mystery/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { playSound } from '@/games/mystery/sound';
import { CountdownRing } from '@/shared/components/CountdownRing';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

/** Mini-game 1: spend shared search tokens to turn over locations. */
export default function Search({ view, send }: Props) {
  const tokens = view.searchLeft ?? 0;
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  // Stable identities so CountdownRing effects don't resubscribe every render.
  const handleExpire = useCallback(() => playSound('time'), []);
  const handleTick = useCallback(() => playSound('tick'), []);

  return (
    <div className="app">
      <m.div className="token-bar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="token-label">Search tokens</span>
        <span className="token-count" aria-label={`${tokens} search tokens left`}>
          {'🔍'.repeat(Math.max(0, tokens)) || '—'}
        </span>
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Locations
        </m.h2>
        <div className="location-grid">
          {(view.locations ?? []).map((l) => {
            const disabled = l.searched || l.locked || tokens <= 0;
            return (
              <m.div
                key={l.id}
                className={`location-card${l.searched ? ' location-searched' : ''}${l.locked ? ' location-locked' : ''}`}
                variants={fadeUp}
              >
                <p className="location-name">
                  {l.locked ? '🔒 ' : ''}
                  {l.name}
                </p>
                <p className="location-desc muted">{l.description}</p>
                {l.locked ? (
                  <p className="muted location-note">Locked — find its key clue first.</p>
                ) : l.searched ? (
                  <p className="muted location-note">Searched ✓</p>
                ) : (
                  <button
                    className="btn btn-ghost btn-small"
                    disabled={disabled}
                    onClick={() => send({ t: 'search', locationId: l.id })}
                  >
                    Search (1 🔍)
                  </button>
                )}
              </m.div>
            );
          })}
        </div>
        {view.me.isHost && (
          <m.button
            className="btn btn-ghost"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Move to alibis
          </m.button>
        )}
      </m.div>

      {view.searchEndsAt !== undefined && (
        <CountdownRing
          key={view.searchEndsAt}
          endsAt={view.searchEndsAt}
          totalSeconds={view.searchDurationSec ?? 0}
          size={104}
          onExpire={handleExpire}
          onTick={handleTick}
        />
      )}

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Pinned clues ({(view.clues ?? []).length})
        </m.h2>
        {(view.clues ?? []).length === 0 ? (
          <m.p className="muted" variants={fadeUp}>
            Nothing pinned yet — search a location above.
          </m.p>
        ) : (
          <div className="clue-list">
            {(view.clues ?? []).map((c) => (
              <m.div key={c.id} className="clue-item" variants={fadeUp}>
                <p className="clue-title">📌 {c.title}</p>
                <p className="clue-detail">{c.detail}</p>
              </m.div>
            ))}
          </div>
        )}
        {!view.me.isHost && (
          <m.p className="muted center" variants={fadeUp}>
            Waiting on {hostName} to move things along…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
