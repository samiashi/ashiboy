import type { StoredSession } from '@/games/mafia/net/persistence';
import { GameHome } from '@/shared/components/GameHome';
import HowToPlay from '@/games/mafia/ui/HowToPlay';

interface Props {
  connecting: boolean;
  error: string | null;
  prefillCode: string;
  prefillName: string;
  prefillAvatar: string;
  session: StoredSession | null;
  onCreate(name: string, avatar: string): void;
  onJoin(code: string, name: string, avatar: string): void;
  onRejoin(session: StoredSession): void;
  onForgetSession(): void;
  onDismissError?(): void;
}

/** Mafia entry screen — words and rules live here, structure is shared. */
export default function Home(props: Props) {
  return (
    <GameHome
      title="Mafia"
      tagline="A game of hidden identity and deception. This app replaces the moderator — everyone gets to play."
      howToPlay={<HowToPlay />}
      {...props}
    />
  );
}
