import type { StoredSession } from '@/games/hottake/net/persistence';
import { GameHome } from '@/shared/components/GameHome';
import HowToPlay from '@/games/hottake/ui/HowToPlay';

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

/** Hot Take entry screen — words and rules live here, structure is shared. */
export default function Home(props: Props) {
  return (
    <GameHome
      title="Hot Take"
      tagline="Absurd prompts, funnier friends — write it, vote it, take the crown."
      howToPlay={<HowToPlay />}
      {...props}
    />
  );
}
