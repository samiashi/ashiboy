/**
 * Site-wide player identity (name + avatar), shared across all games.
 * Per-game seats live in each game's own persistence module.
 */

const PROFILE_KEY = 'ashiboy-profile';

export interface Profile {
  name: string;
  avatar: string;
}

/** A saved seat in an ongoing game room (shape shared by every game). */
export interface RoomTicket {
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
