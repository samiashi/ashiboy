import { motion } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mafia/engine/types';
import { fadeUp, popIn, staggerParent } from '@/anim';
import { ROLE_INFO } from '@/games/mafia/ui/roles';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

const NIGHT_PROMPT: Record<string, string> = {
  mafia: 'Choose a victim.',
  detective: 'Choose someone to investigate.',
  doctor: 'Choose someone to protect.',
};

function NightSky() {
  return (
    <div className="night-sky" aria-hidden="true">
      <i className="stars-a" />
      <i className="stars-b" />
      <span className="moon" />
    </div>
  );
}

export default function Night({ view, send }: Props) {
  const nameOf = (id?: string) => view.players.find((p) => p.id === id)?.name ?? '—';
  const role = view.me.role!;

  if (!view.me.alive) {
    return (
      <div className="app">
        <div className="card card-night center">
          <NightSky />
          <h1 className="title-sm">Night {view.round}</h1>
          <p className="muted">
            You were eliminated. The night continues without you — stay quiet.
          </p>
          {view.me.isHost && (view.nightPending ?? 0) > 0 && (
            <button className="btn btn-ghost btn-small" onClick={() => send({ t: 'skipNight' })}>
              Stalled? Resolve the night now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!view.nightOptions) {
    return (
      <div className="app">
        <div className="card card-night center">
          <NightSky />
          <p className="muted center">Night {view.round} — you are the</p>
          <h1 className="role-title role-villager center">Villager</h1>
          <p className="sleep-icon">z z z</p>
          <p className="muted">
            Close your eyes. The night crew is at work
            {view.nightPending ? ` (${view.nightPending} still acting)…` : '…'}
          </p>
          {view.me.isHost && (view.nightPending ?? 0) > 0 && (
            <button className="btn btn-ghost btn-small" onClick={() => send({ t: 'skipNight' })}>
              Stalled? Resolve the night now
            </button>
          )}
        </div>
      </div>
    );
  }

  const info = ROLE_INFO[role];

  return (
    <div className="app">
      <motion.div
        className="card card-night"
        variants={staggerParent}
        initial="hidden"
        animate="show"
      >
        <NightSky />
        <motion.p className="muted center" variants={fadeUp}>
          Night {view.round} — you are the
        </motion.p>
        <motion.h1 className={`role-title center ${info.cssClass}`} variants={fadeUp}>
          {info.label}
        </motion.h1>
        <motion.p className="center" variants={fadeUp}>
          {NIGHT_PROMPT[role]}
        </motion.p>

        <motion.div className="grid" variants={staggerParent}>
          {view.nightOptions.map((id) => {
            const target = view.players.find((p) => p.id === id);
            const pickers = view.mafiaPicks
              ? Object.entries(view.mafiaPicks).filter(([m, t]) => t === id && m !== view.me.id)
              : [];
            return (
              <motion.button
                key={id}
                className={`chip${view.myNightPick === id ? ' chip-selected' : ''}`}
                onClick={() => send({ t: 'nightAct', targetId: id })}
                variants={popIn}
                whileTap={{ scale: 0.94 }}
              >
                <span>
                  <span className="avatar">{target?.avatar}</span> {target?.name}
                </span>
                {pickers.length > 0 && (
                  <span className="chip-note">
                    picked by {pickers.map(([m]) => nameOf(m)).join(', ')}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        <motion.p className="muted center" variants={fadeUp}>
          {view.myNightPick
            ? `Your pick: ${nameOf(view.myNightPick)} — you can change it until everyone has acted.`
            : `Waiting for ${view.nightPending ?? 0} player${view.nightPending === 1 ? '' : 's'}…`}
        </motion.p>
        {view.me.isHost && (view.nightPending ?? 0) > 0 && (
          <motion.button
            className="btn btn-ghost btn-small"
            onClick={() => send({ t: 'skipNight' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Stalled? Resolve the night now ({view.nightPending} still acting)
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
