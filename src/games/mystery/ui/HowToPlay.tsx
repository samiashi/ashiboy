import { m } from 'motion/react';

/** Collapsible rules card for first-time investigators. */
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
          You are all investigators on the same team. Open the case file, then crack it across{' '}
          <strong>three mini-games</strong> — every clue and secret is shared, and the verdict is
          shared too.
        </p>
        <h3>The three mini-games</h3>
        <ul>
          <li>
            <strong>Search.</strong> Spend shared search tokens to turn over locations and pin their
            clues. One room is locked until its key clue turns up elsewhere.
          </li>
          <li>
            <strong>Alibis.</strong> Every suspect tells a story. Spend shared pressure to crack
            open secrets — but there are more suspects than pressure, so choose who to press.
          </li>
          <li>
            <strong>Verdict.</strong> Name the killer, the weapon, and the scene. A miss burns one
            of your few attempts; run dry and the trail goes cold.
          </li>
        </ul>
        <h3>Stars</h3>
        <p>
          Solve it on the first verdict with tokens to spare for <strong>three stars</strong>. Wrong
          verdicts and empty pockets cost you — but a solved case is always a win.
        </p>
      </div>
    </m.details>
  );
}
