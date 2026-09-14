import { useEffect, useMemo, useRef, useState } from 'react';
import { formatClock } from '@/shared/format';

interface Props {
  endsAt: number;
  totalSeconds: number;
  /** Ring diameter in px (default 128). */
  size?: number;
  /** Fired once when the deadline passes. */
  onExpire(): void;
  /** Fired once per second through the final five seconds. */
  onTick?(): void;
}

/**
 * Live countdown to a host-set deadline. Every device runs its own ticker;
 * the first expiry trigger wins (engines ignore the rest).
 */
export function CountdownRing({ endsAt, totalSeconds, size = 128, onExpire, onTick }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const lastTick = useRef(Number.POSITIVE_INFINITY);

  // A new deadline is a new countdown — allow expiry/ticks to fire again.
  // Without this, only the first timed turn ever auto-passes per mount.
  useEffect(() => {
    fired.current = false;
    lastTick.current = Number.POSITIVE_INFINITY;
  }, [endsAt]);

  useEffect(() => {
    // 500ms is plenty for a per-second display + 1s host enforcement, and
    // halves the re-render rate versus the old 250ms ticker.
    const id = window.setInterval(() => {
      setNow((prev) => {
        const next = Date.now();
        // Skip re-renders when the displayed second hasn't changed and we're
        // far from expiry (still tick at least every interval near the end).
        return next - prev < 200 &&
          Math.ceil((endsAt - prev) / 1000) === Math.ceil((endsAt - next) / 1000)
          ? prev
          : next;
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (remainingMs <= 0 && !fired.current) {
      fired.current = true;
      onExpire();
    }
  }, [remainingMs, onExpire]);

  useEffect(() => {
    if (remainingSec <= 5 && remainingSec > 0 && remainingSec < lastTick.current) {
      lastTick.current = remainingSec;
      onTick?.();
    }
  }, [remainingSec, onTick]);

  const { fraction, circumference, label, timeSize } = useMemo(() => {
    const totalMs = Math.max(1, totalSeconds * 1000);
    const radius = size / 2 - 8;
    return {
      fraction: Math.min(1, remainingMs / totalMs),
      circumference: 2 * Math.PI * radius,
      label: `${formatClock(remainingSec)} left`,
      timeSize: Math.round(size * 0.21),
    };
  }, [remainingMs, remainingSec, totalSeconds, size]);
  const radius = size / 2 - 8;
  const late = remainingSec <= 10;
  const boxStyle = useMemo(() => ({ width: size, height: size }), [size]);
  const timeStyle = useMemo(() => ({ fontSize: timeSize }), [timeSize]);

  return (
    <div className="countdown">
      <div
        className={`countdown-ring${late ? ' countdown-late' : ''}`}
        style={boxStyle}
        role="timer"
        aria-label={label}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} className="countdown-track" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="countdown-fill"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
          />
        </svg>
        <span className="countdown-time" style={timeStyle}>
          {formatClock(remainingSec)}
        </span>
      </div>
    </div>
  );
}
