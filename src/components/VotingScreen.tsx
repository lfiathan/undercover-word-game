import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { PlayerList } from "./shared/PlayerList";
import { useSound } from "@/context/SoundContext";
import { useTranslation } from "react-i18next";
import { Gavel, Hourglass } from "lucide-react";

export const VotingScreen = () => {
  const { gameState, submitVote } = useGame();
  const { peer, isHost, sendToHost } = usePeer();
  const { playSound } = useSound();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const { t } = useTranslation();

  useEffect(() => {
    playSound("/sounds/new-page.mp3");
  }, []);

  const currentPlayer = gameState.players.find((p) => p.id === peer?.id);
  const hasVoted = currentPlayer && gameState.votingResults?.[currentPlayer.id];
  const isEliminated = currentPlayer?.isEliminated;

  // Sort players by speaking order (and filter out eliminated players)
  const activePlayers = gameState.speakingOrder.map((id) =>
    gameState.players.find((p) => p.id === id),
  );

  // Don't show voting UI if player is eliminated
  if (isEliminated) {
    return (
      <div className="animate-fade-in space-y-5">
        <header className="space-y-1 text-center">
          <Hourglass className="mx-auto h-7 w-7 text-white/40" />
          <h2 className="font-display text-2xl font-bold text-white">
            {t("voting.inProgress")}
          </h2>
        </header>
        <PlayerList
          players={activePlayers}
          votingResults={gameState.votingResults}
          currentPlayerId={peer?.id}
        />
      </div>
    );
  }

  const handleVote = () => {
    playSound("/sounds/submit-vote.wav");
    if (currentPlayer && selectedPlayer) {
      if (isHost) {
        submitVote(currentPlayer.id, selectedPlayer);
      } else {
        sendToHost({
          type: "SUBMIT_VOTE",
          voterId: currentPlayer.id,
          targetId: selectedPlayer,
        });
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-5 pb-24">
      <header className="space-y-1.5 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-200">
          <Gavel className="h-3.5 w-3.5" />
          {t("voting.inProgress")}
        </span>
        <h2 className="font-display text-2xl font-bold text-white">
          {t("voting.voteToEliminate")}
        </h2>
      </header>

      <PlayerList
        players={activePlayers}
        selectedPlayer={selectedPlayer}
        onPlayerClick={!hasVoted ? setSelectedPlayer : undefined}
        votingResults={gameState.votingResults}
        currentPlayerId={peer?.id}
      />

      {!hasVoted && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-background/80 p-4 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl">
            <Button
              onClick={handleVote}
              disabled={!selectedPlayer}
              className="tap-scale h-14 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-brand-two py-4 text-base font-bold text-white shadow-xl shadow-rose-500/25 hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              {t("voting.submitVote")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
