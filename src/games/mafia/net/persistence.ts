/**
 * localStorage persistence for player identity.
 * - Profile (name + avatar) is shared across all games on the site.
 * - Session (seat + rejoin token) is per game and enables mid-game rejoins.
 */

const PROFILE_KEY = 'ashiboy-profile';
const SESSION_KEY = 'ashiboy-mafia-session';

export interface Profile {
  name: string;
  avatar: string;
}

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

export function loadProfile(): Profile | null {
  return read<Profile>(PROFILE_KEY);
}

export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, profile);
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
