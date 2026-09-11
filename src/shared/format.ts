/** m:ss clock formatting for timers across games. */
export function formatClock(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
