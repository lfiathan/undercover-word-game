import { GameProvider } from "../context/GameContext";
import { PeerProvider } from "../context/PeerContext";
import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { GameSetup } from "../components/GameSetup";
import { GameLobby } from "../components/GameLobby";
import { WordReveal } from "../components/WordReveal";
import { MultiplayerSetup } from "../components/MultiplayerSetup";
import { VotingScreen } from "../components/VotingScreen";
import { Results } from "../components/Results";
import { GameEnd } from "../components/GameEnd";
import { VisitorView } from "../components/VisitorView";
import { SoundProvider } from "@/context/SoundContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VenetianMask } from "lucide-react";

const GameContent = () => {
  const { gameState } = useGame();
  const { hostId, isVisitor } = usePeer();

  if (!hostId) {
    return <MultiplayerSetup />;
  }

  // Visitors follow every phase from one screen rather than being walked
  // through the players' flow.
  if (isVisitor) {
    return <VisitorView />;
  }

  if (gameState.phase === "setup" && gameState.currentRound === 0) {
    return <GameSetup />;
  }

  if (gameState.phase === "setup" && gameState.currentRound >= 1) {
    return <GameLobby />;
  }

  switch (gameState.phase) {
    case "wordReveal":
      return <WordReveal />;
    case "voting":
      return <VotingScreen />;
    case "results":
      return <Results />;
    case "gameEnd":
      return <GameEnd />;
    default:
      return <GameLobby />;
  }
};

/**
 * Atmosphere layer: a dark base with a few slow, heavily blurred colour
 * fields and a film grain over the top. Fixed and pointer-events-none, so it
 * never interferes with the game itself.
 */
const Backdrop = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(258_50%_14%),_hsl(258_45%_6%)_55%,_hsl(260_50%_4%))]" />
    <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand/25 blur-[120px] animate-float" />
    <div className="absolute -right-24 top-1/4 h-[24rem] w-[24rem] rounded-full bg-brand-two/20 blur-[120px] animate-float-slow" />
    <div className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-brand-three/15 blur-[130px] animate-float" />
    <div className="grain absolute inset-0 opacity-[0.16] mix-blend-overlay" />
  </div>
);

const Index = () => {
  return (
    <div className="relative min-h-[100dvh] text-foreground">
      <Backdrop />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-two shadow-lg shadow-brand/30">
              <VenetianMask className="h-5 w-5 text-white" />
            </span>
            <span className="font-display text-lg font-extrabold uppercase tracking-[0.18em] text-white/90">
              Undercover
            </span>
          </div>
          <LanguageSwitcher />
        </header>

        <SoundProvider>
          <GameProvider>
            <PeerProvider>
              <main className="flex flex-1 flex-col">
                <GameContent />
              </main>
            </PeerProvider>
          </GameProvider>
        </SoundProvider>

        <footer className="mt-10 text-center text-xs text-white/35">
          <a
            href="https://github.com/antebrl/undercover-word-game"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white/60"
          >
            Based on the open-source Undercover game by antebrl
          </a>
        </footer>
      </div>
    </div>
  );
};

export default Index;
