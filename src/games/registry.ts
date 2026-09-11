import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import mafiaPreview from '@/assets/mafia-preview.svg';

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
];
