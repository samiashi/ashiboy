interface Props {
  message: string | null;
  onDismiss(): void;
}

/** Dismissible error toast pinned to the viewport bottom. */
export function Toast({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div className="toast" onClick={onDismiss} role="alert">
      {message}
    </div>
  );
}
