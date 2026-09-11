import { m } from 'motion/react';

/** Collapsible rules card for players who've never played Codenames. */
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
          Two teams race to contact all their secret agents first. Each team has one{' '}
          <strong>spymaster</strong> who sees the key; everyone else is a field operative who sees
          only codenames.
        </p>
        <h3>A turn</h3>
        <ul>
          <li>
            <strong>Clue.</strong> Your spymaster gives one word plus a number (e.g.{' '}
            <em>tree: 2</em>) — or ∞ for a wide-open hunt.
          </li>
          <li>
            <strong>Guesses.</strong> Discuss out loud, then tap cards one at a time. Your color
            keeps you going (up to the number + 1); a bystander or rival agent ends the turn — and
            helps them.
          </li>
        </ul>
        <h3>Winning & losing</h3>
        <p>
          Cover all your agents first and you win — even on the other team's turn. But touch the{' '}
          <strong>assassin</strong> and you lose on the spot.
        </p>
      </div>
    </m.details>
  );
}
