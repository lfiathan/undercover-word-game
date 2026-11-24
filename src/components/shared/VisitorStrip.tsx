import { Eye } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useTranslation } from "react-i18next";

/**
 * Visitors see every word and role, so players are always told who is
 * watching. Shown wherever people are sitting around waiting or playing.
 */
export const VisitorStrip = () => {
  const { gameState } = useGame();
  const { t } = useTranslation();
  const visitors = gameState.visitors ?? [];

  if (visitors.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/35">
        <Eye className="h-3.5 w-3.5" />
        {t("playerList.watching", { count: visitors.length })}
      </span>
      {visitors.map((visitor) => (
        <span
          key={visitor.id}
          className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-xs text-white/65"
        >
          {visitor.name}
        </span>
      ))}
    </div>
  );
};
