import { useCallback, useMemo, useState } from 'react';
import { m } from 'motion/react';
import { ClientMessage, PlayerView, Team, ViewCard } from '@/games/codenames/engine/types';
import { fadeUp, staggerParent } from '@/anim';
import { playSound } from '@/games/codenames/sound';
import { CountdownRing } from '@/shared/components/CountdownRing';
import { Stepper } from '@/shared/components/Stepper';

interface Props {
  view: PlayerView;
  send(msg: ClientMessage): void;
}

function teamLabel(team: Team): string {
  return team === 'red' ? 'Red' : 'Blue';
}

function Board({ cards, onGuess }: { cards: ViewCard[]; onGuess?: (index: number) => void }) {
  return (
    <div className="board">
      {cards.map((c, i) => {
        let cls = 'word-card';
        if (c.revealed && c.kind) cls += ` word-covered-${c.kind}`;
        else if (c.kind) cls += ` word-key-${c.kind}`;
        const label = c.revealed && c.kind ? `${c.word}, ${c.kind}` : c.word;
        return onGuess && !c.revealed ? (
          <m.button
            key={i}
            type="button"
            className={cls}
            aria-label={`Guess ${c.word}`}
            onClick={() => onGuess(i)}
            whileTap={{ scale: 0.93 }}
          >
            {c.word}
          </m.button>
        ) : (
          <div key={i} className={cls} aria-label={label}>
            {c.word}
          </div>
        );
      })}
    </div>
  );
}

function Composer({ send }: { send(msg: ClientMessage): void }) {
  const [word, setWord] = useState('');
  const [count, setCount] = useState(2);
  const [unlimited, setUnlimited] = useState(false);
  const clean = word.trim();
  const valid = clean.length > 0 && !/\s/.test(clean);

  return (
    <div className="card">
      <h2 className="section-title">Give a clue</h2>
      <p className="muted center">
        One word, plus how many of your agents it points to. No forms of board words, no extra
        hints.
      </p>
      <div className="composer-row">
        <input
          className="input"
          placeholder="Clue word"
          aria-label="Clue word"
          value={word}
          maxLength={30}
          autoComplete="off"
          autoCapitalize="characters"
          onChange={(e) => setWord(e.target.value.toUpperCase())}
        />
        <Stepper
          value={unlimited ? '∞' : count}
          label="clue number"
          onMinus={() => setCount((c) => Math.max(0, c - 1))}
          onPlus={() => setCount((c) => Math.min(9, c + 1))}
          minusDisabled={unlimited || count <= 0}
          plusDisabled={unlimited || count >= 9}
          minusLabel="−"
          plusLabel="+"
        />
      </div>
      <div className="preset-row">
        <button
          className={`pill-btn${unlimited ? ' pill-btn-selected' : ''}`}
          aria-pressed={unlimited}
          onClick={() => setUnlimited((u) => !u)}
        >
          ∞ unlimited
        </button>
      </div>
      <button
        className="btn btn-primary"
        disabled={!valid}
        onClick={() =>
          send({ t: 'giveClue', word: clean, number: unlimited ? 'unlimited' : count })
        }
      >
        Send clue{valid ? `: ${clean} ${unlimited ? '∞' : count}` : ''}
      </button>
    </div>
  );
}

export default function Table({ view, send }: Props) {
  const turn = view.turn!;
  const myTurn = view.me.team !== null && view.me.team === turn.team;
  const iAmSpy = view.me.isSpymaster && myTurn;
  const iAmGuesser = !view.me.isSpymaster && myTurn;
  const history = useMemo(
    () => (turn.clue ? view.clues!.slice(0, -1) : (view.clues ?? [])),
    [turn.clue, view.clues],
  );
  const guessesText =
    turn.guessesLeft === null
      ? turn.clue
        ? 'unlimited guesses'
        : ''
      : `${turn.guessesLeft} ${turn.guessesLeft === 1 ? 'guess' : 'guesses'} left`;
  // Stable identities so CountdownRing effects don't resubscribe every render.
  const handleExpire = useCallback(() => send({ t: 'passTurn' }), [send]);
  const handleTick = useCallback(() => playSound('tick'), []);
  const handleGuess = useCallback((i: number) => send({ t: 'guess', cardIndex: i }), [send]);

  return (
    <div className="app">
      <m.div className="scorebar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {(['red', 'blue'] as Team[]).map((t) => (
          <div key={t} className={`score${turn.team === t ? ` score-${t}-active` : ''}`}>
            <span className="score-name">{t}</span>
            <span className="score-count">{view.remaining?.[t] ?? 0}</span>
          </div>
        ))}
      </m.div>

      {turn.clue && (
        <m.div
          className="clue-banner"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="eyebrow">{teamLabel(turn.team)} clue</p>
          <div>
            <span className="clue-word">{turn.clue.word}</span>
            <span className="clue-number">
              {turn.clue.number === 'unlimited' ? '∞' : turn.clue.number}
            </span>
          </div>
          {guessesText && <p className="clue-meta muted">{guessesText}</p>}
        </m.div>
      )}

      {view.phase === 'clue' &&
        (iAmSpy ? (
          <Composer send={send} />
        ) : (
          <div className="card center">
            <p className="muted">
              {teamLabel(turn.team)} spymaster is thinking
              {view.me.team === turn.team ? ' — discuss quietly' : '…'}
            </p>
          </div>
        ))}

      <m.div className="card" variants={staggerParent} initial="hidden" animate="show">
        <Board
          cards={view.cards ?? []}
          onGuess={view.phase === 'guessing' && iAmGuesser ? handleGuess : undefined}
        />
        {view.phase === 'guessing' && iAmGuesser && (
          <m.button
            className="btn btn-ghost"
            disabled={turn.guessesMade < 1}
            onClick={() => send({ t: 'endTurn' })}
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
          >
            End turn
          </m.button>
        )}
        {view.me.isHost && (
          <m.div className="row" variants={fadeUp}>
            <button className="btn btn-ghost btn-small" onClick={() => send({ t: 'passTurn' })}>
              Pass turn
            </button>
            {view.turnEndsAt !== undefined && (
              <button className="btn btn-ghost btn-small" onClick={() => send({ t: 'extendTurn' })}>
                +1:00
              </button>
            )}
          </m.div>
        )}
      </m.div>

      {view.turnEndsAt !== undefined && (
        <CountdownRing
          key={view.turnEndsAt}
          endsAt={view.turnEndsAt}
          totalSeconds={view.turnDurationSec ?? 0}
          size={104}
          onExpire={handleExpire}
          onTick={handleTick}
        />
      )}

      {history.length > 0 && (
        <div className="card">
          <h2 className="section-title">Earlier clues</h2>
          <div className="clue-history">
            {history.map((c, i) => (
              <div className="clue-history-row" key={`${c.team}-${c.word}-${i}`}>
                <span className={`team-dot team-dot-${c.team}`} aria-hidden="true" />
                <span className="clue-history-word">{c.word}</span>
                <span className="muted">{c.number === 'unlimited' ? '∞' : c.number}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
