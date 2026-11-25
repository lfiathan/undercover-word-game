import { Eye, Gamepad2 } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { usePeer } from "@/context/PeerContext";
import { useTranslation } from "react-i18next";

/**
 * Play or watch, decided inside the room rather than on the way in.
 *
 * Only between games: once words are dealt a seat change would mean handing
 * out or taking back a role mid-round. The host always plays -- they drive
 * the game, and the watching screen has no controls to start it with.
 */
export const SeatToggle = () => {
  const { gameState } = useGame();
  const { isHost, isVisitor, setSeat } = usePeer();
  const { t } = useTranslation();

  if (isHost || gameState.phase !== "setup") return null;

  const options = [
    { value: false, label: t("multiplayerSetup.asPlayer"), Icon: Gamepad2 },
    { value: true, label: t("multiplayerSetup.asVisitor"), Icon: Eye },
  ];

  return (
    <section className="surface p-4">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/40">
        {t("gameSetup.seatLabel")}
      </p>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
        {options.map(({ value, label, Icon }) => {
          const active = isVisitor === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSeat(value)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? value
                    ? "bg-brand-three/25 text-cyan-100"
                    : "bg-brand/30 text-white"
                  : "text-white/45 hover:text-white/75"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-white/35">
        {isVisitor
          ? t("multiplayerSetup.watchExplainer")
          : t("multiplayerSetup.joinSubtitle")}
      </p>
    </section>
  );
};
