import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
// ?url + assetsInlineLimit:0 emits tile art as separate hashed files so the
// bytes never inline into the initial JS bundle (fetched lazily via <img>).
import mafiaPreview from '@/assets/mafia-preview.svg?url';
import codenamesPreview from '@/assets/codenames-preview.svg?url';
import mysteryPreview from '@/assets/mystery-preview.svg?url';
import hottakePreview from '@/assets/hottake-preview.svg?url';

export interface GameProps {
  /** Query params from the hash route, e.g. '#/mafia?join=ABC123'. */
  params: URLSearchParams;
}

export interface GameInfo {
  /** URL slug, e.g. '/mafia'. */
  slug: string;
  title: string;
  tagline: string;
  players: string;
  /** Artwork shown on the hub tile. */
  preview: string;
  component: LazyExoticComponent<ComponentType<GameProps>>;
}

/**
 * Every game on the site registers itself here.
 * To add a game: create src/games/<name>/ with a default-exported
 * component accepting GameProps, then add one entry below.
 */
export const games: GameInfo[] = [
  {
    slug: '/mafia',
    title: 'Mafia',
    tagline: 'The classic game of deception — no moderator needed, everyone plays.',
    players: '3–20 players',
    preview: mafiaPreview,
    component: lazy(() => import('@/games/mafia')),
  },
  {
    slug: '/codenames',
    title: 'Codenames',
    tagline: 'Two spy teams race to contact their agents — one word at a time.',
    players: '4–20 players',
    preview: codenamesPreview,
    component: lazy(() => import('@/games/codenames')),
  },
  {
    slug: '/mystery',
    title: 'Mystery',
    tagline: 'One case, three mini-games, one shared verdict — solve it together.',
    players: '1–20 players',
    preview: mysteryPreview,
    component: lazy(() => import('@/games/mystery')),
  },
  {
    slug: '/hottake',
    title: 'Hot Take',
    tagline: 'Absurd prompts, funnier friends — write it, vote it, take the crown.',
    players: '3–12 players',
    preview: hottakePreview,
    component: lazy(() => import('@/games/hottake')),
  },
];
