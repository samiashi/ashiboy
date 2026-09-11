import { m } from 'motion/react';
import { games } from '@/games/registry';
import { fadeUp, staggerParent } from '@/anim';
import comingSoonArt from '@/assets/coming-soon.svg';

export default function Hub() {
  return (
    <div className="app">
      <m.header className="hub-hero" variants={staggerParent} initial="hidden" animate="show">
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

      <m.div className="game-grid" variants={staggerParent} initial="hidden" animate="show">
        {games.map((g) => (
          <m.a key={g.slug} className="card game-tile" href={`#${g.slug}`} variants={fadeUp}>
            <span className="game-tile-art">
              <img src={g.preview} alt={`${g.title} artwork`} loading="lazy" />
            </span>
            <span className="game-tile-body">
              <span className="display game-tile-title">{g.title}</span>
              <span className="muted game-tile-tagline">{g.tagline}</span>
              <span className="game-tile-foot">
                <span className="pill">{g.players}</span>
                <span className="game-card-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </span>
          </m.a>
        ))}
        <m.div className="card game-tile game-tile-disabled" variants={fadeUp}>
          <span className="game-tile-art">
            <img src={comingSoonArt} alt="More games coming soon" loading="lazy" />
          </span>
          <span className="game-tile-body">
            <span className="display game-tile-title">More games</span>
            <span className="muted game-tile-tagline">The house is preparing new tables.</span>
          </span>
        </m.div>
      </m.div>
    </div>
  );
}
