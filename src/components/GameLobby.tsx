import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { PlayerList } from "./shared/PlayerList";
import { useTranslation } from "react-i18next";

export const GameLobby = () => {
  const { gameState, startGame } = useGame();
  const { isHost } = usePeer();
  const { t } = useTranslation();

  const handleStartNextRound = () => {
    startGame();
  };

  const activeCount = gameState.players.filter((player) => !player.isEliminated).length;

  return (
    <div className="mx-auto w-full max-w-md animate-fade-in space-y-5">
      <h1 className="text-center font-display text-2xl font-bold text-white">
        {t("gameLobby.title")}
      </h1>

      <PlayerList
        players={gameState.players}
        showEliminated={true}
        lastEliminatedId={gameState.lastEliminatedId}
        showScores={gameState.players.some((p) => p.score > 0)}
      />

      {isHost && (
        <Button
          onClick={handleStartNextRound}
          size="lg"
          className="tap-scale h-14 w-full rounded-2xl bg-gradient-to-r from-brand to-brand-two text-base font-bold text-white shadow-xl shadow-brand/30 hover:brightness-110"
        >
          <Play className="mr-2 h-5 w-5" />
          {t("gameLobby.startNextRound", { count: activeCount })}
        </Button>
      )}
    </div>
  );
};
