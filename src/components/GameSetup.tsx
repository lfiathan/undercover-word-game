import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Check, Copy, Languages, Minus, Plus, Share2, Play } from "lucide-react";
import { toast } from "sonner";
import { PlayerList } from "./shared/PlayerList";
import { useIsMobile } from "@/hooks/use-mobile";
import { distributionMeetsLimits } from "@/config/roleDistribution";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORD_LANGUAGES } from "@/config/wordLanguages";

type StepperProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  canDecrease: boolean;
  canIncrease: boolean;
  tone: string;
};

const RoleStepper = ({
  label,
  value,
  onChange,
  canDecrease,
  canIncrease,
  tone,
}: StepperProps) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-2 pl-4">
    <div className="flex min-w-0 items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
      <span className="truncate text-sm text-white/70">{label}</span>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        className="h-9 w-9 rounded-lg bg-white/[0.06] text-white hover:bg-white/15 disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-7 text-center font-display text-lg font-bold tabular-nums text-white">
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        className="h-9 w-9 rounded-lg bg-white/[0.06] text-white hover:bg-white/15 disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export const GameSetup = () => {
  const { gameState, startGame, updateRoleDistribution, setWordLanguage } = useGame();
  const { hostId, isHost } = usePeer();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const gameLink = `${window.location.origin}${import.meta.env.BASE_URL}?gameId=${hostId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(gameLink);
      setCopied(true);
      toast.success(t("gameSetup.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(gameLink);
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return handleCopyLink();
    try {
      await navigator.share({
        title: t("welcome"),
        text: t("gameSetup.shareText", { code: hostId }),
        url: gameLink,
      });
    } catch {
      /* the user dismissed the share sheet */
    }
  };

  const hasEnoughPlayers = gameState.players.length >= 4;
  const roleDistribution = gameState.roleDistribution;
  const civilians =
    gameState.players.length - roleDistribution.mrWhites - roleDistribution.undercovers;

  return (
    <div className="animate-fade-in space-y-5">
      {/* Room code: the one thing everyone needs off this screen. */}
      <section className="surface-raised relative overflow-hidden p-6 text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-brand/25 to-transparent blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            {t("gameSetup.shareLabel")}
          </p>
          <p className="text-gradient-brand mt-3 font-mono text-[2.75rem] font-bold leading-none tracking-[0.22em] sm:text-6xl">
            {hostId}
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <Button
              onClick={handleCopyLink}
              className="tap-scale h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white hover:bg-white/[0.12]"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {t("gameSetup.copy")}
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button
                onClick={handleShare}
                className="tap-scale h-11 rounded-xl bg-gradient-to-r from-brand to-brand-two px-4 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:brightness-110"
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t("gameSetup.share")}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className={isMobile ? "space-y-5" : "grid grid-cols-2 items-start gap-5"}>
        <PlayerList
          players={gameState.players}
          showScores={gameState.players.some((p) => p.score > 0)}
        />

        <div className="space-y-5">
          <section className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-brand-three" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">
                  {t("gameSetup.wordLanguage")}
                </h3>
              </div>
              <Select
                value={gameState.wordLanguage ?? "en"}
                onValueChange={setWordLanguage}
                disabled={!isHost}
              >
                <SelectTrigger
                  className="h-10 w-[170px] rounded-xl border-white/10 bg-black/25 text-sm text-white disabled:opacity-70"
                  aria-label={t("gameSetup.wordLanguage")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-popover/95 backdrop-blur-xl">
                  {WORD_LANGUAGES.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/35">
              {t("gameSetup.wordLanguageHint")}
            </p>
          </section>

          <section className="surface p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
              {t("gameSetup.roleDistribution")}
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-white/70">{t("gameSetup.civilians")}</span>
                </div>
                <span className="font-display text-lg font-bold tabular-nums text-white">
                  {civilians}
                </span>
              </div>

              <RoleStepper
                label={t("gameSetup.undercovers")}
                value={roleDistribution.undercovers}
                tone="bg-brand-two"
                onChange={(next) =>
                  updateRoleDistribution({ ...roleDistribution, undercovers: next })
                }
                canDecrease={
                  isHost &&
                  distributionMeetsLimits(
                    { ...roleDistribution, undercovers: roleDistribution.undercovers - 1 },
                    gameState.players.length,
                  )
                }
                canIncrease={
                  isHost &&
                  distributionMeetsLimits(
                    { ...roleDistribution, undercovers: roleDistribution.undercovers + 1 },
                    gameState.players.length,
                  )
                }
              />

              <RoleStepper
                label={t("gameSetup.mrWhites")}
                value={roleDistribution.mrWhites}
                tone="bg-white/70"
                onChange={(next) =>
                  updateRoleDistribution({ ...roleDistribution, mrWhites: next })
                }
                canDecrease={
                  isHost &&
                  distributionMeetsLimits(
                    { ...roleDistribution, mrWhites: roleDistribution.mrWhites - 1 },
                    gameState.players.length,
                  )
                }
                canIncrease={
                  isHost &&
                  distributionMeetsLimits(
                    { ...roleDistribution, mrWhites: roleDistribution.mrWhites + 1 },
                    gameState.players.length,
                  )
                }
              />
            </div>
          </section>

          <div className="space-y-2">
            {!hasEnoughPlayers && (
              <p className="text-center text-sm text-amber-300/80">
                {t("gameSetup.atLeastFourPlayers")}
              </p>
            )}
            <Button
              onClick={startGame}
              size="lg"
              disabled={!isHost || !hasEnoughPlayers}
              className="tap-scale h-14 w-full rounded-2xl bg-gradient-to-r from-brand to-brand-two text-base font-bold text-white shadow-xl shadow-brand/30 hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              <Play className="mr-2 h-5 w-5" />
              {t("gameSetup.startGame", { count: gameState.players.length })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
