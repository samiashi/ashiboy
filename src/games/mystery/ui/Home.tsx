import type { StoredSession } from '@/games/mystery/net/persistence';
import { GameHome } from '@/shared/components/GameHome';
import HowToPlay from '@/games/mystery/ui/HowToPlay';

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

/** Mystery entry screen — words and rules live here, structure is shared. */
export default function Home(props: Props) {
  return (
    <GameHome
      title="Mystery"
      tagline="One case, three mini-games, one shared verdict — solve it together."
      howToPlay={<HowToPlay />}
      {...props}
    />
  );
}
