import { useState } from 'react';
import { m } from 'motion/react';
import { ClientMessage, PlayerView } from '@/games/mystery/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { PresetRow } from '@/shared/components/PresetRow';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

function nameOf(list: { id: string; name: string }[] | undefined, id: string): string {
  return list?.find((x) => x.id === id)?.name ?? id;
}

/** Mini-game 3: anyone may submit the team's shared verdict. */
export default function Verdict({ view, send }: Props) {
  const suspects = view.suspects ?? [];
  const weapons = view.weapons ?? [];
  const locations = view.locations ?? [];
  const [suspectId, setSuspectId] = useState(suspects[0]?.id ?? '');
  const [weaponId, setWeaponId] = useState(weapons[0]?.id ?? '');
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const attemptsLeft = view.attemptsLeft ?? 0;
  const ready = suspectId !== '' && weaponId !== '' && locationId !== '' && attemptsLeft > 0;

  return (
    <div className="app">
      <m.div className="token-bar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="token-label">Verdicts left</span>
        <span className="token-count" aria-label={`${attemptsLeft} verdicts left`}>
          {'⚖️'.repeat(Math.max(0, attemptsLeft)) || '—'}
        </span>
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Name the killer
        </m.h2>
        <m.p className="muted" variants={fadeUp}>
          Talk it out, then anyone submits the team's verdict. A miss burns an attempt.
        </m.p>
        <m.div variants={fadeUp}>
          <p className="muted picker-label">Who?</p>
          <PresetRow<string>
            ariaLabel="Suspect"
            options={suspects.map((s) => ({ label: s.name, value: s.id }))}
            value={suspectId}
            onSelect={setSuspectId}
          />
        </m.div>
        <m.div variants={fadeUp}>
          <p className="muted picker-label">With what?</p>
          <PresetRow<string>
            ariaLabel="Weapon"
            options={weapons.map((w) => ({ label: w.name, value: w.id }))}
            value={weaponId}
            onSelect={setWeaponId}
          />
        </m.div>
        <m.div variants={fadeUp}>
          <p className="muted picker-label">Where?</p>
          <PresetRow<string>
            ariaLabel="Scene"
            options={locations.map((l) => ({ label: l.name, value: l.id }))}
            value={locationId}
            onSelect={setLocationId}
          />
        </m.div>
        <m.button
          className="btn btn-primary"
          disabled={!ready}
          onClick={() => send({ t: 'accuse', suspectId, weaponId, locationId })}
          variants={fadeUp}
          whileTap={{ scale: 0.97 }}
        >
          Deliver the verdict
        </m.button>
      </m.div>

      {(view.attempts ?? []).length > 0 && (
        <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
          <m.h2 className="section-title" variants={fadeUp}>
            Past verdicts
          </m.h2>
          <div className="clue-list">
            {(view.attempts ?? []).map((a, i) => (
              <m.p key={i} className="muted" variants={fadeUp}>
                {a.playerName} named {nameOf(suspects, a.suspectId)} · {nameOf(weapons, a.weaponId)}{' '}
                · {nameOf(locations, a.locationId)} — {a.correct ? 'correct!' : 'missed.'}
              </m.p>
            ))}
          </div>
        </m.div>
      )}
    </div>
  );
}
