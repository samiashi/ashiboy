import { useMemo } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { MIN_PLAYERS } from '@/games/codenames/engine/engine';
import { ClientMessage, PlayerView, Team } from '@/games/codenames/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { formatClock } from '@/shared/format';
import { PresetRow } from '@/shared/components/PresetRow';
import { RoomCodeCard } from '@/shared/components/RoomCodeCard';

interface Props {
  view: PlayerView;
  roomCode: string;
  send(msg: ClientMessage): void;
}

const TURN_PRESETS = [
  { label: 'Off', seconds: 0 },
  { label: '1:00', seconds: 60 },
  { label: '2:00', seconds: 120 },
  { label: '3:00', seconds: 180 },
  { label: '5:00', seconds: 300 },
];

/** Why the game can't start yet (mirrors the engine's start validation). */
function blockers(view: PlayerView): string[] {
  const out: string[] = [];
  if (view.players.length < MIN_PLAYERS) {
    out.push(
      `Need at least ${MIN_PLAYERS - view.players.length} more player${view.players.length === MIN_PLAYERS - 1 ? '' : 's'}`,
    );
  }
  for (const team of ['red', 'blue'] as Team[]) {
    const members = view.players.filter((p) => p.team === team);
    const spies = members.filter((p) => p.isSpymaster).length;
    const ops = members.filter((p) => !p.isSpymaster).length;
    const label = team === 'red' ? 'Red' : 'Blue';
    if (spies === 0) out.push(`${label} needs a spymaster`);
    else if (spies > 1) out.push(`${label} has too many spymasters`);
    if (ops < 1) out.push(`${label} needs an operative`);
  }
  const unteamed = view.players.filter((p) => p.team === null);
  if (unteamed.length > 0) {
    out.push(
      `${unteamed.map((p) => p.name).join(', ')} ha${unteamed.length === 1 ? 's' : 've'} no team yet`,
    );
  }
  return out;
}

function TeamColumn({
  view,
  team,
  send,
}: {
  view: PlayerView;
  team: Team;
  send(msg: ClientMessage): void;
}) {
  const members = view.players.filter((p) => p.team === team);
  const spy = members.find((p) => p.isSpymaster);
  const me = view.me;
  return (
    <div className={`team-col team-col-${team}`}>
      <h3>
        <span className={`team-dot team-dot-${team}`} aria-hidden="true" />
        {team} · {members.length}
      </h3>
      <ul className="player-list">
        <AnimatePresence initial={false}>
          {members.map((p) => (
            <m.li
              key={p.id}
              className={`player-row team-seat${p.connected ? '' : ' player-offline'}`}
              variants={fadeUp}
              exit={{ opacity: 0, x: -20 }}
            >
              <span className="seat-name">
                <span className="avatar">{p.avatar}</span>
                <span className="seat-name-text">{p.name}</span>
                {p.id === me.id && <span className="muted">(you)</span>}
              </span>
              <span className="row-end seat-actions">
                {(p.id === me.id || me.isHost) && (
                  <button
                    className={`star-btn${p.isSpymaster ? ' star-btn-on' : ''}`}
                    aria-pressed={p.isSpymaster}
                    aria-label={`${p.isSpymaster ? 'Remove' : 'Make'} ${p.name} spymaster`}
                    onClick={() =>
                      send({ t: 'setSpymaster', targetId: p.id, value: !p.isSpymaster })
                    }
                  >
                    {p.isSpymaster ? '★' : '☆'}
                  </button>
                )}
                {p.isHost && <span className="pill">host</span>}
                {me.isHost && p.id !== me.id && (
                  <button
                    className="btn btn-ghost btn-mini"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => send({ t: 'remove', targetId: p.id })}
                  >
                    Remove
                  </button>
                )}
              </span>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      <p className="muted team-spy-note">
        {spy ? `Spymaster: ${spy.name}` : 'Needs a spymaster — star a seat'}
      </p>
      {me.team !== team ? (
        <button
          className="btn btn-ghost btn-small"
          onClick={() => send({ t: 'setTeam', targetId: me.id, team })}
        >
          Join {team}
        </button>
      ) : (
        <button
          className="btn btn-ghost btn-small"
          onClick={() => send({ t: 'setTeam', targetId: me.id, team: null })}
        >
          Leave team
        </button>
      )}
    </div>
  );
}

export default function Lobby({ view, roomCode, send }: Props) {
  const isHost = view.me.isHost;
  const config = view.config!;
  const problems = useMemo(() => blockers(view), [view]);
  const inviteLink = useMemo(() => {
    const hashBase = location.hash.split('?')[0].replace(/^#/, '') || '/codenames';
    return `${location.origin}${location.pathname}#${hashBase}?join=${roomCode}`;
  }, [roomCode]);

  return (
    <div className="app">
      <RoomCodeCard roomCode={roomCode} inviteLink={inviteLink} />

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Teams ({view.players.length})
        </m.h2>
        <div className="team-columns">
          <TeamColumn view={view} team="red" send={send} />
          <TeamColumn view={view} team="blue" send={send} />
        </div>
        {isHost && (
          <m.button
            className="btn btn-ghost"
            onClick={() => send({ t: 'randomize' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Randomize teams
          </m.button>
        )}
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Setup
        </m.h2>
        {isHost ? (
          <>
            <m.p className="muted picker-label" variants={fadeUp}>
              Turn timer
            </m.p>
            <m.div variants={fadeUp}>
              <PresetRow
                ariaLabel="Turn timer"
                options={TURN_PRESETS.map((p) => ({ label: p.label, value: p.seconds }))}
                value={config.turnSeconds}
                onSelect={(seconds) => send({ t: 'setConfig', config: { turnSeconds: seconds } })}
              />
            </m.div>
          </>
        ) : null}
        <m.p className="muted setup-summary" variants={fadeUp}>
          Starting team is random ·{' '}
          {config.turnSeconds > 0 ? `${formatClock(config.turnSeconds)} turns` : 'untimed turns'}
        </m.p>
        {isHost ? (
          <m.button
            className="btn btn-primary"
            disabled={problems.length > 0}
            onClick={() => send({ t: 'start' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            {problems.length > 0 ? problems[0] : 'Deal the board'}
          </m.button>
        ) : (
          <m.p className="muted center" variants={fadeUp}>
            Waiting for the host to start…
          </m.p>
        )}
      </m.div>
    </div>
  );
}
