import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

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

  const totalMs = Math.max(1, totalSeconds * 1000);
  const fraction = Math.min(1, remainingMs / totalMs);
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const late = remainingSec <= 10;

  return (
    <div className="countdown">
      <div
        className={`countdown-ring${late ? ' countdown-late' : ''}`}
        style={{ width: size, height: size }}
        role="timer"
        aria-label={`${formatClock(remainingSec)} left`}
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
        <span className="countdown-time" style={{ fontSize: Math.round(size * 0.21) }}>
          {formatClock(remainingSec)}
        </span>
      </div>
    </div>
  );
}
