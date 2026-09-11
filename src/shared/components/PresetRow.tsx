interface Option<T extends string | number> {
  label: string;
  value: T;
}

interface Props<T extends string | number> {
  options: Option<T>[];
  value: T;
  onSelect(value: T): void;
  ariaLabel?: string;
}

/** Single-select pill options (timer presets, counts, …). */
export function PresetRow<T extends string | number>({
  options,
  value,
  onSelect,
  ariaLabel,
}: Props<T>) {
  return (
    <div className="preset-row" role={ariaLabel ? 'group' : undefined} aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.label}
          className={`pill-btn${value === o.value ? ' pill-btn-selected' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onSelect(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
