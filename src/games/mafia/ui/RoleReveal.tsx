import { useState } from 'react';
import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { ROLE_INFO } from '@/games/mafia/ui/roles';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

export default function RoleReveal({ view, send }: Props) {
  const [flipped, setFlipped] = useState(false);
  const role = view.me.role!;
  const info = ROLE_INFO[role];
  // The engine only waits for connected players — count the same set it does.
  const eligible = view.players.filter((p) => p.connected).length;
  const readyCount = view.players.filter((p) => p.ready && p.connected).length;
  const meReady = view.players.find((p) => p.id === view.me.id)?.ready;

  return (
    <div className="app">
      <m.div
        className="card card-luxe center"
        variants={staggerParent}
        initial="hidden"
        animate="show"
      >
        <m.p className="muted" variants={fadeUp}>
          Your secret role — don't show anyone
        </m.p>

        <m.div variants={fadeUp} className="flip-scene">
          <button
            type="button"
            className={`flip-inner${flipped ? ' flipped' : ''}`}
            onClick={() => setFlipped(true)}
            aria-label={flipped ? `Your role: ${info.label}` : 'Tap to reveal your role'}
          >
            <span className="flip-face flip-back" aria-hidden={flipped}>
              <span className="flip-mark">?</span>
              <p>{flipped ? 'Revealed' : 'Tap to reveal'}</p>
            </span>
            <span className="flip-face flip-front">
              <span className={`role-title ${info.cssClass}`}>{info.label}</span>
              <span className="muted flip-blurb">{info.blurb}</span>
              {view.mafiaTeammates && view.mafiaTeammates.length > 0 && (
                <span className="teammates">
                  <span className="muted">Your fellow mafia: </span>
                  <span className="teammate-names">
                    {view.mafiaTeammates.map((t) => t.name).join(', ')}
                  </span>
                </span>
              )}
            </span>
          </button>
        </m.div>

        <m.button
          className="btn btn-primary"
          disabled={!flipped || meReady}
          onClick={() => send({ t: 'ackRole' })}
          variants={fadeUp}
          whileTap={{ scale: 0.97 }}
        >
          {!flipped
            ? 'Reveal your role first'
            : meReady
              ? `Waiting for others (${readyCount}/${eligible})…`
              : 'Got it — hide my role'}
        </m.button>
      </m.div>
    </div>
  );
}
