import { useGame } from "@/context/GameContext";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const MrWhiteGuess = () => {
  const { gameState } = useGame();
  const { t } = useTranslation();

  if (!gameState.mrWhiteGuess) return null;

  const isCorrect =
    gameState.mrWhiteGuess.toLowerCase() === gameState.majorityWord.toLowerCase();

  return (
    <div
      className={`mt-4 flex items-center gap-3 rounded-xl border p-4 text-left animate-pop-in ${
        isCorrect
          ? "border-emerald-400/30 bg-emerald-400/10"
          : "border-destructive/30 bg-destructive/10"
      }`}
    >
      {isCorrect ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
      )}
      <p className="text-sm text-white/80">
        {t("gameEnd.mrWhiteGuessed")}{" "}
        <span className="font-display font-bold text-white">{gameState.mrWhiteGuess}</span>
      </p>
    </div>
  );
};
