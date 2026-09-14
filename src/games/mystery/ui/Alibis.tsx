import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mystery/engine/types';
import { fadeUp, staggerParent } from '@/anim';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

/** Mini-game 2: spend shared pressure to crack open suspects' secrets. */
export default function Alibis({ view, send }: Props) {
  const pressure = view.pressureLeft ?? 0;
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';

  return (
    <div className="app">
      <m.div className="token-bar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="token-label">Pressure</span>
        <m.span
          key={pressure}
          className="token-count"
          aria-label={`${pressure} pressure left`}
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        >
          {'❗'.repeat(Math.max(0, pressure)) || '—'}
        </m.span>
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Suspects — check the alibis
        </m.h2>
        <div className="suspect-list">
          {(view.suspects ?? []).map((s) => (
            <m.div
              key={s.id}
              className={`suspect-card${s.secretRevealed ? ' suspect-cracked' : ''}`}
              variants={fadeUp}
            >
              <p className="suspect-name">{s.name}</p>
              <p className="suspect-role muted">{s.role}</p>
              <p className="suspect-bio">{s.bio}</p>
              <p className="suspect-alibi">
                <em>“{s.alibi}”</em>
              </p>
              {s.secretRevealed ? (
                <m.p
                  className="secret-reveal"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  💥 {s.secret}
                </m.p>
              ) : (
                <button
                  className="btn btn-ghost btn-small"
                  disabled={pressure <= 0}
                  onClick={() => send({ t: 'press', suspectId: s.id })}
                >
                  Press (1 ❗)
                </button>
              )}
            </m.div>
          ))}
        </div>
        {view.me.isHost ? (
          <m.button
            className="btn btn-ghost"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Move to the verdict
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to call the verdict…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
