interface Props {
  /** Game name shown left, e.g. "Mafia". */
  title: string;
  /** Trailing context, e.g. " · Night 2" (include leading separator). */
  phaseLabel?: string;
  muted: boolean;
  onToggleMute(): void;
}

/** Site chrome above every game: home link, current phase, mute toggle. */
export function TopBar({ title, phaseLabel = '', muted, onToggleMute }: Props) {
  const confirmLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // The host's tab is the room — leaving ends the game for everyone.
    if (!window.confirm('Leave the game? The room ends for everyone if you host it.')) {
      e.preventDefault();
    }
  };
  return (
    <div className="topbar">
      <a
        className="topbar-link"
        href="#/"
        onClick={confirmLeave}
        aria-label="Ashiboy home — leaves the current game"
      >
        Ashiboy
      </a>
      <span className="topbar-right">
        <span className="muted topbar-phase">
          {title}
          {phaseLabel}
        </span>
        <button
          className="sound-toggle"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </span>
    </div>
  );
}
