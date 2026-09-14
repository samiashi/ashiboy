import { useCallback, useState } from 'react';
import { m } from 'motion/react';
import { MAX_ANSWER } from '@/games/hottake/engine/engine';
import { ClientMessage, PlayerView } from '@/games/hottake/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { playSound } from '@/games/hottake/sound';
import { CountdownRing } from '@/shared/components/CountdownRing';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

/** Everyone writes one answer to the shared prompt. Texts stay sealed. */
export default function Answering({ view, send }: Props) {
  const [draft, setDraft] = useState(view.myText ?? '');
  const clean = draft.trim();
  const submitted = (view.myText ?? '').length > 0;
  const connected = view.players.filter((p) => p.connected);
  const waiting = connected.filter((p) => !(view.submittedIds ?? []).includes(p.id)).length;
  // Stable identities so CountdownRing effects don't resubscribe every render.
  const handleExpire = useCallback(() => playSound('time'), []);
  const handleTick = useCallback(() => playSound('tick'), []);

  return (
    <div className="app">
      <m.div
        className="prompt-banner"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="eyebrow">
          Prompt {view.promptNumber} of {view.promptsTotal}
        </p>
        <p className="prompt-text">{view.promptText}</p>
      </m.div>

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <m.h2 className="section-title" variants={fadeUp}>
          Your answer
        </m.h2>
        <m.div className="composer-row" variants={fadeUp}>
          <input
            className="input"
            placeholder="Make ’em laugh…"
            aria-label="Your answer"
            value={draft}
            maxLength={MAX_ANSWER}
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && clean.length > 0) send({ t: 'answer', text: clean });
            }}
          />
        </m.div>
        <m.button
          className="btn btn-primary"
          disabled={clean.length === 0}
          onClick={() => send({ t: 'answer', text: clean })}
          variants={fadeUp}
          whileTap={{ scale: 0.97 }}
        >
          {submitted ? 'Update answer' : 'Submit answer'}
        </m.button>
        <m.p className="muted center" variants={fadeUp}>
          {submitted
            ? 'Locked in — you can still edit until voting opens.'
            : waiting <= 1
              ? 'Waiting on the last writer…'
              : `Waiting on ${waiting} writers…`}
        </m.p>
        {view.me.isHost && (
          <m.button
            className="btn btn-ghost"
            onClick={() => send({ t: 'advance' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            Close answers
          </m.button>
        )}
      </m.div>

      {view.answerEndsAt !== undefined && (
        <CountdownRing
          key={view.answerEndsAt}
          endsAt={view.answerEndsAt}
          totalSeconds={view.answerDurationSec ?? 0}
          size={104}
          onExpire={handleExpire}
          onTick={handleTick}
        />
      )}
    </div>
  );
}
