import { m } from 'motion/react';

/** Collapsible rules card for first-time hot-takers. */
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
          Everyone gets the same absurd prompt. Write the funniest answer you can — then vote for
          the best one. Just not your own.
        </p>
        <h3>A round</h3>
        <ul>
          <li>
            <strong>Write.</strong> One answer per prompt, on your own phone. Nobody sees it until
            voting opens.
          </li>
          <li>
            <strong>Vote.</strong> Every answer lands on an anonymous ballot. Pick the funniest —
            self-votes don’t count.
          </li>
          <li>
            <strong>Score.</strong> Authors are revealed with the votes:{' '}
            <strong>100 points per vote</strong>.
          </li>
        </ul>
        <h3>Winning</h3>
        <p>
          Most points after the last prompt takes the crown — ties share it. Blank late? You’ll sit
          the ballot out but can still vote.
        </p>
      </div>
    </m.details>
  );
}
