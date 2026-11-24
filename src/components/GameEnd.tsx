import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { RotateCcw, Skull, Trophy } from "lucide-react";
import { useSound } from "@/context/SoundContext";
import { useEffect } from "react";
import { MrWhiteGuess } from "./shared/MrWhiteGuess";
import { useTranslation } from "react-i18next";

export const GameEnd = () => {
  const { gameState, resetGame, setGameState } = useGame();
  const { peer, isHost } = usePeer();
  const { playSound } = useSound();
  const { t } = useTranslation();

  const currentPlayer = gameState.players.find((p) => p.id === peer?.id);

  useEffect(() => {
    // Update scores for winners
    const updatedPlayers = gameState.players.map((player) => {
      const currentScore = player.score || 0;
      let pointsToAdd = 0;

      if (gameState.winner === "civilian" && player.role === "civilian") {
        pointsToAdd = 2;
      } else if (gameState.winner === "undercover" && player.role === "undercover") {
        pointsToAdd = 10;
      } else if (gameState.winner === "mrwhite" && player.role === "mrwhite") {
        pointsToAdd = 6;
      } else if (gameState.winner === "infiltrators") {
        if (player.role === "undercover") pointsToAdd = 10;
        if (player.role === "mrwhite") pointsToAdd = 6;
      }

      return {
        ...player,
        score: currentScore + pointsToAdd,
      };
    });

    setGameState({ ...gameState, players: updatedPlayers });

    switch (gameState.winner) {
      case "civilian":
        playSound("/sounds/civilians-win.mp3");
        break;
      case "infiltrators":
      case "undercover":
        playSound("/sounds/undercover-win.mp3");
        break;
      case "mrwhite":
        playSound("/sounds/mrwhite-win.mp3");
        break;
    }
  }, []);

  const getWinnerPlayers = () => {
    if (gameState.winner === "infiltrators") {
      return gameState.players.filter(
        (p) => p.role === "undercover" || p.role === "mrwhite",
      );
    }
    return gameState.players.filter((p) => p.role === gameState.winner);
  };

  const iWon = gameState.winner === currentPlayer?.role ||
    (gameState.winner === "infiltrators" &&
      (currentPlayer?.role === "undercover" || currentPlayer?.role === "mrwhite"));

  return (
    <div className="animate-fade-in space-y-5">
      <section className="relative overflow-hidden rounded-2xl p-8 text-center animate-pop-in">
        <div
          className={`pointer-events-none absolute inset-0 ${
            iWon
              ? "bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.28),_transparent_65%)]"
              : "bg-[radial-gradient(ellipse_at_top,_hsl(var(--destructive)/0.22),_transparent_65%)]"
          }`}
        />
        <div className="relative space-y-4">
          <span
            className={`mx-auto grid h-20 w-20 place-items-center rounded-3xl border ${
              iWon
                ? "border-gold/30 bg-gold/15 shadow-[0_0_50px_-12px_hsl(var(--gold)/0.7)]"
                : "border-destructive/30 bg-destructive/15"
            }`}
          >
            {iWon ? (
              <Trophy className="h-10 w-10 text-gold" />
            ) : (
              <Skull className="h-10 w-10 text-rose-300" />
            )}
          </span>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              {t("gameEnd.title")}
            </p>
            <h1 className="text-gradient font-display text-3xl font-extrabold sm:text-4xl">
              {gameState.winner === "civilian" && t("gameEnd.civilianWin")}
              {gameState.winner === "undercover" && t("gameEnd.undercoverWin")}
              {gameState.winner === "mrwhite" && t("gameEnd.mrWhiteWin")}
              {gameState.winner === "infiltrators" && t("gameEnd.infiltratorsWin")}
            </h1>
          </div>

          <MrWhiteGuess />
        </div>
      </section>

      <section className="surface p-5">
        <ul className="space-y-2">
          {getWinnerPlayers().map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold/80 to-amber-600/80 text-xs font-bold text-black/80">
                {player.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{player.name}</p>
                <p className="truncate text-xs text-white/45">
                  {t(`roles.${player.role}`)}
                  {player.word && ` · ${t("gameEnd.word")} ${player.word}`}
                </p>
              </div>
              {player.score !== undefined && (
                <span className="ml-auto shrink-0 rounded-full bg-gold/15 px-2.5 py-1 font-display text-sm font-bold text-gold">
                  {player.score}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost && (
        <Button
          onClick={resetGame}
          size="lg"
          className="tap-scale h-14 w-full rounded-2xl bg-gradient-to-r from-brand to-brand-two text-base font-bold text-white shadow-xl shadow-brand/30 hover:brightness-110"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          {t("gameEnd.startNewRound")}
        </Button>
      )}
    </div>
  );
};
