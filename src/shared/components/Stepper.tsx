import { m } from 'motion/react';

interface Props {
  value: React.ReactNode;
  onMinus(): void;
  onPlus(): void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  minusLabel?: string;
  plusLabel?: string;
}

/** Minus/plus stepper with a prominent center value. */
export function Stepper({
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
  minusLabel = '−',
  plusLabel = '+',
}: Props) {
  return (
    <div className="stepper">
      <m.button
        className="btn btn-small"
        onClick={onMinus}
        disabled={minusDisabled}
        whileTap={{ scale: 0.9 }}
        aria-label="Decrease"
      >
        {minusLabel}
      </m.button>
      <span className="stepper-value">{value}</span>
      <m.button
        className="btn btn-small"
        onClick={onPlus}
        disabled={plusDisabled}
        whileTap={{ scale: 0.9 }}
        aria-label="Increase"
      >
        {plusLabel}
      </m.button>
    </div>
  );
}
