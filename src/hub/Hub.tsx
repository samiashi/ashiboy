import { m } from 'motion/react';
import { games } from '@/games/registry';
import { fadeUp, staggerParent } from '@/anim';

export default function Hub() {
  return (
    <div className="app">
      <m.header className="hub-hero" variants={staggerParent} initial="hidden" animate="show">
        <m.p className="eyebrow" variants={fadeUp}>
          A parlor of party games
        </m.p>
        <m.h1 className="title title-shimmer" variants={fadeUp}>
          Ashiboy
        </m.h1>
        <m.p className="muted hub-tagline" variants={fadeUp}>
          Party games you play in the room, straight from your phones.
        </m.p>
        <m.div className="deco-rule" variants={fadeUp} aria-hidden="true">
          <span />
          <i>◆</i>
          <span />
        </m.div>
      </m.header>

      <m.div className="game-list" variants={staggerParent} initial="hidden" animate="show">
        {games.map((g) => (
          <m.a key={g.slug} className="card game-card" href={`#${g.slug}`} variants={fadeUp}>
            <div className="game-card-body">
              <h2 className="display">{g.title}</h2>
              <p className="muted">{g.tagline}</p>
            </div>
            <span className="game-card-side">
              <span className="pill">{g.players}</span>
              <span className="game-card-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </m.a>
        ))}
        <m.div className="card game-card game-card-disabled" variants={fadeUp}>
          <div className="game-card-body">
            <h2 className="display">More games</h2>
            <p className="muted">The house is preparing new tables. Coming soon.</p>
          </div>
        </m.div>
      </m.div>
    </div>
  );
}
