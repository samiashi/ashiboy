/** Selectable player avatars. Distinct silhouettes so players are easy to tell apart at a glance. */
export const AVATARS = [
  '🦊',
  '🐼',
  '🐸',
  '🦁',
  '🐙',
  '🦄',
  '🐝',
  '🦉',
  '🐢',
  '🐳',
  '🦖',
  '🐺',
  '🐰',
  '🦜',
  '🐯',
  '🦝',
  '🐨',
  '🦘',
  '🦔',
  '🦇',
  '🐬',
  '🦩',
  '🦚',
  '🦋',
  '🐞',
  '🐌',
  '🐒',
  '🦍',
] as const;

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
