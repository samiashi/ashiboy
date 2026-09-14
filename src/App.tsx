import { Component, Suspense, useEffect, useReducer, type ReactNode } from 'react';
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

class GameErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="app">
          <div className="card center">
            <h1 className="title-sm">Couldn&apos;t load this game</h1>
            <p className="muted">Check your connection and try again.</p>
            <a className="btn" href="#/">
              ← All games
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    window.addEventListener('hashchange', rerender);
    return () => window.removeEventListener('hashchange', rerender);
  }, []);

  const { path, params } = parseHash();
  const game = games.find((g) => g.slug === path);
  const joinCode = params.get('join') ?? '';
  const isKnownRoute = path === '/' || game !== undefined;

  // Hash routes don't move the viewport — always restart at the top,
  // e.g. returning to the hub from deep inside a game.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  // Key on the invite code too so pasting a second invite while already on
  // the game page remounts the join form with the new code.
  const swapKey = game ? `${game.slug}?join=${joinCode}` : path;

  return (
    // No mode="wait" — enter/exit run in parallel so route changes never pay
    // a full serialized exit duration before painting.
    <AnimatePresence initial={false}>
      <m.div
        key={swapKey}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={screenSwap}
      >
        <Suspense
          fallback={
            <div className="app">
              <p className="muted center pad" role="status">
                Loading…
              </p>
            </div>
          }
        >
          <GameErrorBoundary key={swapKey}>
            {game ? (
              <game.component params={params} />
            ) : isKnownRoute ? (
              <Hub />
            ) : (
              <div className="app">
                <div className="card center">
                  <h1 className="title-sm">Game not found</h1>
                  <p className="muted">Check the link — this table doesn&apos;t exist.</p>
                  <a className="btn" href="#/">
                    ← All games
                  </a>
                </div>
              </div>
            )}
          </GameErrorBoundary>
        </Suspense>
      </m.div>
    </AnimatePresence>
  );
}
