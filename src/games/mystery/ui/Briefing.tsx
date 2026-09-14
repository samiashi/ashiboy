import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mystery/engine/types';
import { fadeUp, staggerParent } from '@/anim';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

/** The case file, read out. Everyone studies the victim and the lineup. */
export default function Briefing({ view, send }: Props) {
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  return (
    <div className="app">
      <m.div className="card center" variants={staggerParent} initial="hidden" animate="show">
        <m.p className="eyebrow" variants={fadeUp}>
          Case file
        </m.p>
        <m.h1 className="title" variants={fadeUp}>
          {view.caseTitle}
        </m.h1>
        <m.p className="muted" variants={fadeUp}>
          Victim: {view.victim}
        </m.p>
        <m.p className="brief" variants={fadeUp}>
          {view.brief}
        </m.p>
        {view.me.isHost ? (
          <m.button
            className="btn btn-primary"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Begin the search
          </m.button>
        ) : (
          <m.p className="muted" variants={fadeUp}>
            Waiting for {hostName} to begin the search…
          </m.p>
        )}
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          The suspects
        </m.h2>
        <div className="suspect-list">
          {(view.suspects ?? []).map((s) => (
            <m.div key={s.id} className="suspect-card" variants={fadeUp}>
              <p className="suspect-name">{s.name}</p>
              <p className="suspect-role muted">{s.role}</p>
              <p className="suspect-bio">{s.bio}</p>
            </m.div>
          ))}
        </div>
      </m.div>
    </div>
  );
}
