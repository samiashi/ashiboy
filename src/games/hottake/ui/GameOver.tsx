import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/hottake/engine/types';
import { fadeUp, popIn, staggerParent } from '@/anim';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

export default function GameOver({ view, send }: Props) {
  const winners = view.winners ?? [];
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  const iWon = winners.some((w) => w.id === view.me.id);

  return (
    <div className="app">
      <div className="card center gameover-banner gameover-crown">
        <div className="rays" aria-hidden="true" />
        <m.h1
          className="title winner-title winner-crown"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        >
          {winners.length > 1 ? 'Shared crown' : 'Crowned'}
        </m.h1>
        <m.p
          className="muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          {winners.map((w) => w.name).join(' & ')} take{winners.length > 1 ? '' : 's'} the night
          {iWon ? ' — including you' : ''}.
        </m.p>
      </div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Final totals
        </m.h2>
        <ul className="player-list">
          {(view.scores ?? []).map((row, i) => (
            <m.li key={row.id} className="player-row" variants={fadeUp}>
              <span>
                {i === 0 ? '👑 ' : ''}
                {row.name}
                {row.id === view.me.id && <span className="muted"> (you)</span>}
              </span>
              <span className="score-count">{row.score}</span>
            </m.li>
          ))}
        </ul>
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          The night’s best lines
        </m.h2>
        {(view.history ?? []).map((round) => (
          <m.div key={round.promptId} className="history-round" variants={fadeUp}>
            <p className="history-prompt">{round.promptText}</p>
            {round.entries.map((e) => (
              <p key={e.authorId} className="muted">
                “{e.text}” — {e.authorName} ({e.votes * 100})
              </p>
            ))}
          </m.div>
        ))}
        {view.me.isHost ? (
          <m.button
            className="btn btn-primary"
            onClick={() => send({ t: 'playAgain' })}
            variants={popIn}
            whileTap={{ scale: 0.97 }}
          >
            Rematch — fresh prompts
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for {hostName} to deal again…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
