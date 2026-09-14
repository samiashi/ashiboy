import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { ROLE_INFO } from '@/games/mafia/ui/roles';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

export default function VoteResult({ view, send }: Props) {
  const nameOf = (id?: string) => view.players.find((p) => p.id === id)?.name ?? '—';
  const hostName = view.players.find((p) => p.isHost)?.name ?? 'the host';
  const result = view.lastVote;

  return (
    <div className="app">
      <div className="card center">
        <h1 className="title-sm">The verdict</h1>
        <m.div
          initial={{ scale: 2.4, opacity: 0, rotate: -18 }}
          animate={{ scale: 1, opacity: 1, rotate: -7 }}
          transition={{ type: 'spring', stiffness: 300, damping: 17 }}
        >
          <span className={`stamp${result?.eliminatedId ? '' : ' stamp-spared'}`}>
            {result?.eliminatedId ? 'Eliminated' : 'No lynch'}
          </span>
        </m.div>
        {result?.eliminatedId ? (
          <p className="death-note">
            <strong>{nameOf(result.eliminatedId)}</strong> was eliminated. They were{' '}
            <strong className={ROLE_INFO[result.eliminatedRole ?? 'villager'].cssClass}>
              {ROLE_INFO[result.eliminatedRole ?? 'villager'].label}
            </strong>
            .
          </p>
        ) : (
          <p className="death-note">No majority — nobody was eliminated.</p>
        )}
        {view.investigation && (
          <div className="card investigation">
            <p className="muted">Your investigation:</p>
            <p>
              <strong>{nameOf(view.investigation.targetId)}</strong>{' '}
              {view.investigation.isMafia ? 'IS a member of the mafia.' : 'is NOT mafia.'}
            </p>
          </div>
        )}
        {view.me.isHost ? (
          <m.button
            className="btn btn-primary"
            onClick={() => send({ t: 'advance' })}
            whileTap={{ scale: 0.97 }}
          >
            Continue to night {view.round + 1}
          </m.button>
        ) : (
          <p className="muted">Waiting for {hostName}…</p>
        )}
      </div>
    </div>
  );
}
