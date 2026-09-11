interface Props {
  checked: boolean;
  onChange(checked: boolean): void;
  children: React.ReactNode;
}

/** Labeled checkbox row for lobby setup toggles. */
export function CheckRow({ checked, onChange, children }: Props) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}
