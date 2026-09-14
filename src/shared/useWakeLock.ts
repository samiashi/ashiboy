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
        else {
          lock = acquired;
          // The sentinel auto-releases when the tab hides — null it so the
          // visibility handler re-acquires on return.
          const onRelease = () => {
            lock = null;
          };
          (acquired as unknown as EventTarget).addEventListener?.('release', onRelease);
        }
      } catch {
        // denied or unavailable — the game works fine without it
      }
    };

    void request();
    // Single listener: hidden nulls the lock (browsers drop it without firing
    // release everywhere), visible re-acquires.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') lock = null;
      else if (document.visibilityState === 'visible' && !lock) void request();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) void lock.release().catch(() => {});
    };
  }, [active]);
}
