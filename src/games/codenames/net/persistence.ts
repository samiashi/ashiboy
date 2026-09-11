/**
 * Codenames seat persistence (seat + rejoin token) for mid-game rejoins.
 * The name/avatar profile itself lives in `@/shared/identity` (site-wide).
 */

const SESSION_KEY = 'ashiboy-codenames-session';

export type { Profile } from '@/shared/identity';

export interface StoredSession {
  code: string;
  playerId: string;
  token: string;
  name: string;
  avatar: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode) — identity just won't persist
  }
}

export function loadSession(): StoredSession | null {
  return read<StoredSession>(SESSION_KEY);
}

export function saveSession(session: StoredSession): void {
  write(SESSION_KEY, session);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
