import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

type WakeLock = {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
};

/**
 * Keeps the screen awake while active (e.g. for the whole game, so phones
 * don't dim mid-play and miss turns). Silent no-op where the Wake Lock API
 * is unavailable. Locks release automatically when the tab hides, so we
 * re-acquire on visibility change.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: WakeLock };
        if (!nav.wakeLock) return;
        const acquired = await nav.wakeLock.request('screen');
        if (cancelled) await acquired.release();
        else lock = acquired;
      } catch {
        // denied or unavailable — the game works fine without it
      }
    };

    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !lock) void request();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock) void lock.release().catch(() => {});
    };
  }, [active]);
}
