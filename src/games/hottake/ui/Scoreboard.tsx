import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/hottake/engine/types';
import { fadeUp, staggerParent } from '@/anim';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

/** Authorship + votes revealed, with running totals. */
export default function Scoreboard({ view, send }: Props) {
  const result = view.lastResult;
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  const last = (view.promptNumber ?? 1) >= (view.promptsTotal ?? 1);
  const topVotes = Math.max(0, ...(result?.entries.map((e) => e.votes) ?? [0]));

  return (
    <div className="app">
      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.p className="eyebrow" variants={fadeUp}>
          Prompt {view.promptNumber} of {view.promptsTotal} — results
        </m.p>
        <m.p className="prompt-text" variants={fadeUp}>
          {view.promptText}
        </m.p>
        {result && result.entries.length === 0 ? (
          <m.p className="muted" variants={fadeUp}>
            Nobody wrote a thing. A silent round — the room must do better.
          </m.p>
        ) : (
          <div className="result-list">
            {(result?.entries ?? []).map((e) => (
              <m.div
                key={e.authorId}
                className={`result-entry${e.votes === topVotes && topVotes > 0 ? ' result-top' : ''}`}
                variants={fadeUp}
              >
                <p className="result-text">“{e.text}”</p>
                <p className="muted result-meta">
                  {e.authorName} · {e.votes * 100} pts ({e.votes} vote{e.votes === 1 ? '' : 's'})
                </p>
              </m.div>
            ))}
          </div>
        )}
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Totals
        </m.h2>
        <ul className="player-list">
          {(view.scores ?? []).map((row) => (
            <m.li key={row.id} className="player-row" variants={fadeUp}>
              <span>{row.name}</span>
              <span className="score-count">{row.score}</span>
            </m.li>
          ))}
        </ul>
        {view.me.isHost ? (
          <m.button
            className="btn btn-primary"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            {last ? 'See the podium' : 'Next prompt'}
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to continue…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
