import { useGame } from "../context/GameContext";
import { Button } from "@/components/ui/button";
import { usePeer } from "@/context/PeerContext";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { ArrowRight, Send } from "lucide-react";
import { toast } from "sonner";
import { useSound } from "@/context/SoundContext";
import { MrWhiteGuess } from "./shared/MrWhiteGuess";
import { PlayerList } from "./shared/PlayerList";
import { useTranslation } from "react-i18next";

const roleTone: Record<string, string> = {
  civilian: "text-emerald-300",
  undercover: "text-fuchsia-300",
  mrwhite: "text-white",
  spectator: "text-white/60",
};

export const Results = () => {
  const { gameState, setGameState, submitMrWhiteGuess, eliminatePlayer, checkGameEnd } = useGame();
  const { peer, isHost, sendToHost } = usePeer();
  const { playSound } = useSound();
  const [guess, setGuess] = useState("");
  const [tieBreakerPlayers, setTieBreakerPlayers] = useState<string[]>([]);
  const [showEliminatedCard, setShowEliminatedCard] = useState(false);
  const { t } = useTranslation();

  const currentPlayer = gameState.players.find((p) => p.id === peer?.id);
  const eliminatedPlayer = gameState.players.find((p) => p.id === gameState.lastEliminatedId);

  const playEliminationSound = () => {
    if (gameState.mrWhiteGuess) {
      return playSound("/sounds/mrwhite-wrong-guess.mp3");
    }

    switch (eliminatedPlayer?.role) {
      case "mrwhite":
        playSound("/sounds/mrwhite-eliminated.mp3");
        break;
      case "undercover":
        playSound("/sounds/undercover-eliminated.mp3");
        break;
      case "civilian":
        playSound("/sounds/civilian-eliminated.mp3");
        break;
    }
  };

  useEffect(() => {
    if (gameState.lastEliminatedId && gameState.votingResults) {
      // Count votes for each player to determine if there was a tie
      const voteCount: Record<string, number> = {};
      Object.values(gameState.votingResults).forEach((targetId) => {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
      });

      const maxVotes = Math.max(...Object.values(voteCount));
      const mostVotedPlayers = Object.entries(voteCount)
        .filter(([_, votes]) => votes === maxVotes)
        .map(([id]) => id);

      setTieBreakerPlayers(mostVotedPlayers);

      if (mostVotedPlayers.length > 1) {
        setTimeout(() => {
          setShowEliminatedCard(true);
          playEliminationSound();
        }, 7000);
      } else {
        setShowEliminatedCard(true);
        playEliminationSound();
      }
    }
  }, [gameState.lastEliminatedId, gameState.votingResults]);

  const currentPlayerGotEliminated = eliminatedPlayer?.id === currentPlayer?.id;
  const isMrWhiteGuessing = eliminatedPlayer?.role === "mrwhite" && !gameState.mrWhiteGuess;
  const canContinue = isHost && !isMrWhiteGuessing;

  // Sort players by speaking order (and filter out eliminated players)
  const activePlayers = gameState.speakingOrder.map((id) =>
    gameState.players.find((p) => p.id === id),
  );

  const handleGuessSubmit = () => {
    if (!guess.trim()) {
      toast.error(t("results.guessRequired"));
      return;
    }

    if (isHost) {
      submitMrWhiteGuess(guess.trim());
    } else {
      // Send guess to host
      sendToHost({
        type: "MR_WHITE_GUESS",
        guess: guess.trim(),
      });
    }
  };

  const handleContinue = () => {
    eliminatePlayer(eliminatedPlayer?.id);
    setGameState((prev) => {
      const gameWinner = checkGameEnd(prev.players);

      return {
        ...prev,
        phase: gameWinner ? "gameEnd" : "discussion",
        winner: gameWinner || undefined,
        votingResults: {},
      };
    });
  };

  return (
    <div className="animate-fade-in space-y-5">
      <h2 className="text-center font-display text-2xl font-bold text-white">
        {t("results.title")}
      </h2>

      {showEliminatedCard && eliminatedPlayer && (
        <section className="surface-raised relative overflow-hidden p-6 text-center animate-pop-in">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-44 bg-gradient-to-b from-destructive/25 to-transparent blur-3xl" />
          <div className="relative space-y-3">
            <h3 className="font-display text-xl font-bold text-white">
              {currentPlayerGotEliminated
                ? t("results.eliminatedYou")
                : t("results.eliminatedPlayer", { name: eliminatedPlayer.name })}
            </h3>

            <p className="text-sm text-white/55">
              {t(currentPlayerGotEliminated ? "results.youWereA" : "results.theyWereA")}{" "}
              <span
                className={`font-display text-lg font-bold ${
                  roleTone[eliminatedPlayer.role ?? "spectator"]
                }`}
              >
                {t(`roles.${eliminatedPlayer.role}`)}
              </span>
            </p>

            {eliminatedPlayer.role !== "mrwhite" &&
              currentPlayer?.isEliminated &&
              !currentPlayerGotEliminated && (
                <p className="text-sm text-white/50">
                  {t("results.theirWordWas")}{" "}
                  <span className="font-semibold text-white/80">{eliminatedPlayer.word}</span>
                </p>
              )}

            {isMrWhiteGuessing && currentPlayerGotEliminated && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-white/70">{t("results.finalGuess")}</p>
                <div className="flex gap-2">
                  <Input
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGuessSubmit()}
                    placeholder={t("results.enterGuess")}
                    autoFocus
                    className="h-12 flex-1 rounded-xl border-white/10 bg-black/30 text-white placeholder:text-white/25 focus-visible:ring-brand/50"
                  />
                  <Button
                    onClick={handleGuessSubmit}
                    className="tap-scale h-12 w-12 shrink-0 rounded-xl bg-gradient-to-r from-brand to-brand-two p-0 text-white shadow-lg shadow-brand/25 hover:brightness-110"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <MrWhiteGuess />
          </div>
        </section>
      )}

      <PlayerList
        players={activePlayers}
        votingResults={gameState.votingResults}
        currentPlayerId={peer?.id}
        tieBreakerPlayers={
          gameState.mrWhiteGuess == null // prevent playing tiebreaker animation again after mrWhite guess
            ? tieBreakerPlayers
            : []
        }
        lastEliminatedId={gameState.lastEliminatedId}
      />

      <Button
        onClick={handleContinue}
        disabled={!canContinue}
        className="tap-scale h-14 w-full rounded-2xl bg-gradient-to-r from-brand to-brand-two text-base font-bold text-white shadow-xl shadow-brand/30 hover:brightness-110 disabled:bg-none disabled:bg-white/[0.06] disabled:text-white/40 disabled:shadow-none"
      >
        {t("results.continueGame")}
        {canContinue && <ArrowRight className="ml-2 h-5 w-5" />}
      </Button>
    </div>
  );
};
