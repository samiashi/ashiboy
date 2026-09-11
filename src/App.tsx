import { Suspense, useEffect, useReducer } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { games } from '@/games/registry';
import Hub from '@/hub/Hub';
import { screenSwap } from '@/anim';

/**
 * Tiny hash router. Hash-based so the site works on any static host
 * (GitHub Pages, Netlify, ...) with zero server configuration.
 * Routes: '#/' -> hub, '#/<game-slug>' -> game, optional '?key=value' params.
 */
function parseHash(): { path: string; params: URLSearchParams } {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path, query] = hash.split('?');
  return { path, params: new URLSearchParams(query ?? '') };
}

export default function App() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    window.addEventListener('hashchange', rerender);
    return () => window.removeEventListener('hashchange', rerender);
  }, []);

  const { path, params } = parseHash();
  const game = games.find((g) => g.slug === path);

  // Hash routes don't move the viewport — always restart at the top,
  // e.g. returning to the hub from deep inside a game.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  return (
    <Suspense
      fallback={
        <div className="app">
          <p className="muted center pad">Loading…</p>
        </div>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={game ? game.slug : '/'}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={screenSwap}
        >
          {game ? <game.component params={params} /> : <Hub />}
        </m.div>
      </AnimatePresence>
    </Suspense>
  );
}
