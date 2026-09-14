interface Props {
  message: string | null;
  onDismiss(): void;
}

/** Dismissible error toast pinned to the viewport bottom. */
export function Toast({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div className="toast" role="alert">
      <span>{message}</span>
      <button type="button" className="btn btn-ghost btn-mini" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
