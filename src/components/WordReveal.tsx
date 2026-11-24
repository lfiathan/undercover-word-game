import { useGame } from "../context/GameContext";
import { Button } from "@/components/ui/button";
import { usePeer } from "../context/PeerContext";
import { PlayerList } from "./shared/PlayerList";
import { useEffect, useState } from "react";
import { useSound } from "@/context/SoundContext";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Dices, EyeOff, Loader2, SendHorizontal, Vote } from "lucide-react";
import { VisitorStrip } from "./shared/VisitorStrip";

export const WordReveal = () => {
  const { gameState, setPhase, submitDescription, rerollWords } = useGame();
  const { peer, isHost, sendToHost } = usePeer();
  const { playSound } = useSound();
  const { t } = useTranslation();

  const [description, setDescription] = useState("");

  useEffect(() => {
    if (gameState.currentRound === 1) {
      playSound("/sounds/word-reveal.mp3");
    } else {
      playSound("/sounds/new-page.mp3");
    }
  }, []);

  const currentPlayer = gameState.players.find((p) => p.id === peer?.id);

  const handleStartVoting = () => {
    setPhase("voting");
  };

  const handleSubmitDescription = () => {
    if (!description.trim()) return;

    if (description.trim().toLowerCase() === currentPlayer.word.toLowerCase()) {
      toast.error(t("wordReveal.cannotUseWordDirectly"));
      return;
    }

    if (isHost) {
      submitDescription(currentPlayer.id, description.trim());
    } else {
      sendToHost({
        type: "SUBMIT_DESCRIPTION",
        playerId: currentPlayer.id,
        description: description.trim(),
      });
    }
    setDescription("");
  };

  if (!peer) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-white/60">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-sm">{t("wordReveal.connecting")}</p>
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-white/60">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-sm">{t("wordReveal.waitingForData")}</p>
        <p className="font-mono text-xs text-white/30">
          {t("wordReveal.yourId")} {peer.id}
        </p>
      </div>
    );
  }

  // Convert speaking order IDs to player objects
  const speakingOrderPlayers = gameState.speakingOrder
    ? gameState.speakingOrder
        .map((id) => gameState.players.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined && !p.isEliminated)
    : [];

  const currentSpeakerIndex = gameState.speakingOrder
    ? speakingOrderPlayers.findIndex((p) => !p.submittedDescription)
    : 0;
  const myIndex = gameState.speakingOrder
    ? speakingOrderPlayers.findIndex((p) => p.id === currentPlayer.id)
    : 0;
  const isMyTurn = gameState.speakingOrder && currentSpeakerIndex === myIndex;
  const isMrWhite = currentPlayer.role === "mrwhite";

  return (
    <div className="animate-fade-in space-y-5">
      <h2 className="text-center font-display text-2xl font-bold text-white">
        {currentPlayer.isEliminated
          ? t("wordReveal.titleEliminated")
          : t("wordReveal.titleDiscussion")}
      </h2>

      {/* Your secret word: the thing you glance at over and over. */}
      <section className="surface-raised relative overflow-hidden p-7 text-center animate-pop-in">
        <div
          className={`pointer-events-none absolute inset-x-0 -top-28 h-48 blur-3xl ${
            isMrWhite
              ? "bg-gradient-to-b from-white/25 to-transparent"
              : "bg-gradient-to-b from-brand/35 to-transparent"
          }`}
        />
        <div className="relative space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            {isMrWhite
              ? t("wordReveal.youAre")
              : currentPlayer.isEliminated
                ? t("wordReveal.yourWordWas")
                : t("wordReveal.yourWordIs")}
          </p>

          {isMrWhite ? (
            <div className="flex flex-col items-center gap-3">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-white/10">
                <EyeOff className="h-8 w-8 text-white/80" />
              </span>
              <p className="font-display text-3xl font-extrabold text-white">
                {t("wordReveal.mrWhite")}
              </p>
            </div>
          ) : (
            <p className="text-gradient break-words font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              {currentPlayer.word}
            </p>
          )}

          <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/45">
            {isMrWhite ? (
              <>
                {t("wordReveal.listenCarefully")}
                <br />
                {t("wordReveal.figureOutSecretWord")}
              </>
            ) : (
              <>
                {t("wordReveal.describeWithoutSaying")}
                <br />
                {t("wordReveal.beClever")}
              </>
            )}
          </p>
        </div>
      </section>

      <div className="space-y-3">
        <h3
          className={`text-center font-display text-base font-semibold ${
            isMyTurn ? "text-brand" : "text-white/50"
          }`}
        >
          {isMyTurn ? t("wordReveal.yourTurn") : t("wordReveal.speakingOrder")}
        </h3>

        {isMyTurn && (
          <div className="relative animate-pop-in">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitDescription()}
              placeholder={t("wordReveal.enterWordOrPhrase")}
              maxLength={25}
              autoFocus
              className="h-14 rounded-2xl border-brand/40 bg-black/30 pl-5 pr-28 text-base text-white placeholder:text-white/25 focus-visible:ring-brand/60"
            />
            <Button
              onClick={handleSubmitDescription}
              disabled={!description.trim()}
              className="tap-scale absolute right-2 top-2 h-10 rounded-xl bg-gradient-to-r from-brand to-brand-two px-4 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              <SendHorizontal className="mr-1.5 h-4 w-4" />
              {t("wordReveal.submit")}
            </Button>
          </div>
        )}

        <PlayerList
          players={speakingOrderPlayers}
          currentPlayerId={peer.id}
          speakingOrder={true}
        />

        <VisitorStrip />
      </div>

      {isHost && (
        <div className="space-y-2 pt-1">
          <Button
            onClick={handleStartVoting}
            size="lg"
            className="tap-scale h-14 w-full rounded-2xl bg-gradient-to-r from-brand to-brand-two text-base font-bold text-white shadow-xl shadow-brand/30 hover:brightness-110"
          >
            <Vote className="mr-2 h-5 w-5" />
            {t("wordReveal.startVoting")}
          </Button>
          {gameState.currentRound === 1 && (
            <Button
              onClick={() => {
                rerollWords();
                toast.success(t("wordReveal.rerolled"));
              }}
              variant="ghost"
              size="lg"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
            >
              <Dices className="mr-2 h-4 w-4" />
              {t("wordReveal.rerollWords")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
