import type { StoredSession } from '@/games/codenames/net/persistence';
import { GameHome } from '@/shared/components/GameHome';
import HowToPlay from '@/games/codenames/ui/HowToPlay';

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
}

/** Codenames entry screen — words and rules live here, structure is shared. */
export default function Home(props: Props) {
  return (
    <GameHome
      title="Codenames"
      tagline="Two teams race to contact their secret agents — one word at a time."
      howToPlay={<HowToPlay />}
      {...props}
    />
  );
}
