import { m } from 'motion/react';
import { ROLE_INFO } from '@/games/mafia/ui/roles';
import type { Role } from '@/games/mafia/engine/types';

const ROLES: Role[] = ['mafia', 'detective', 'doctor', 'villager'];

/** Collapsible rules card for players who've never played Mafia. */
export default function HowToPlay() {
  return (
    <m.details
      className="card howto"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <summary>
        <span>How to play</span>
        <span className="howto-chevron" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="howto-body">
        <p>
          Two teams hide among the players. The <strong>town</strong> tries to find and eliminate
          the mafia; the <strong>mafia</strong> secretly picks off townspeople until they reach
          parity — then they take over.
        </p>
        <h3>The roles</h3>
        <ul className="howto-roles">
          {ROLES.map((role) => (
            <li key={role}>
              <strong className={ROLE_INFO[role].cssClass}>{ROLE_INFO[role].label}</strong>
              {' — '}
              {ROLE_INFO[role].blurb}
            </li>
          ))}
        </ul>
        <h3>A round</h3>
        <ul>
          <li>
            <strong>Night.</strong> Everyone closes their eyes (for real). Mafia, detective, and
            doctor act secretly on their own phones.
          </li>
          <li>
            <strong>Day.</strong> The Gazette announces who died. Argue out loud about who looks
            suspicious.
          </li>
          <li>
            <strong>Vote.</strong> Everyone votes on their phone — votes are public. Most votes
            wins; a tie eliminates nobody.
          </li>
        </ul>
        <h3>Winning</h3>
        <p>
          Town wins when every mafioso is eliminated. Mafia win the moment they equal the town —
          even in the middle of the night.
        </p>
      </div>
    </m.details>
  );
}
