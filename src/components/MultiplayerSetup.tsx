import { useEffect, useState } from "react";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Eye, Loader2, LogIn, Sparkles, UserPlus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@/lib/roomCode";

type Mode = "menu" | "host" | "join" | "watch";

export const MultiplayerSetup = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { hostGame, joinGame, isBusy } = usePeer();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("gameId") != undefined ? "join" : "menu",
  );
  const [joinId, setJoinId] = useState(
    normalizeRoomCode(searchParams.get("gameId") ?? ""),
  );
  const [username, setUsername] = useState("");

  useEffect(() => {
    const gameId = searchParams.get("gameId");
    if (gameId) {
      setJoinId(normalizeRoomCode(gameId));
      setMode((current) => (current === "menu" ? "join" : current));
    }
  }, [searchParams]);

  const needsCode = mode === "join" || mode === "watch";

  const handleSubmit = () => {
    if (!username.trim()) {
      toast.error(t("multiplayerSetup.enterUsernameError"));
      return;
    }
    if (mode === "host") {
      hostGame(username.trim());
      return;
    }
    if (joinId.length !== ROOM_CODE_LENGTH) {
      toast.error(t("multiplayerSetup.enterGameIdError"));
      return;
    }
    joinGame(joinId, username.trim(), mode === "watch");
  };

  const submitLabel =
    mode === "host"
      ? t("multiplayerSetup.startHosting")
      : mode === "watch"
        ? t("multiplayerSetup.startWatching")
        : t("multiplayerSetup.joinGame");

  const formTitle =
    mode === "host"
      ? t("multiplayerSetup.hostNewGame")
      : mode === "watch"
        ? t("multiplayerSetup.watchGame")
        : t("multiplayerSetup.joinGame");

  return (
    <div className="mx-auto my-auto w-full max-w-md animate-fade-in space-y-8 py-6">
      <div className="space-y-3 text-center">
        <h1 className="text-gradient font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          {t("welcome")}
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/50">
          {t("multiplayerSetup.tagline")}
        </p>
      </div>

      {mode === "menu" && (
        <div className="space-y-3 animate-pop-in">
          <button
            onClick={() => setMode("host")}
            className="tap-scale glow-brand group flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-brand to-brand-two p-5 text-left transition-all hover:brightness-110"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
              <UserPlus className="h-5 w-5 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-bold text-white">
                {t("multiplayerSetup.hostNewGame")}
              </span>
              <span className="block text-xs text-white/70">
                {t("multiplayerSetup.hostSubtitle")}
              </span>
            </span>
          </button>

          <button
            onClick={() => setMode("join")}
            className="tap-scale surface group flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.08]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-white/80 transition-colors group-hover:bg-white/10">
              <LogIn className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-bold text-white">
                {t("multiplayerSetup.joinGame")}
              </span>
              <span className="block text-xs text-white/45">
                {t("multiplayerSetup.joinSubtitle")}
              </span>
            </span>
          </button>

          <button
            onClick={() => setMode("watch")}
            className="tap-scale group flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.06]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-three/15 text-cyan-200">
              <Eye className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-bold text-white/85">
                {t("multiplayerSetup.watchGame")}
              </span>
              <span className="block text-xs text-white/40">
                {t("multiplayerSetup.watchSubtitle")}
              </span>
            </span>
          </button>
        </div>
      )}

      {mode !== "menu" && (
        <div className="surface animate-pop-in space-y-5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            {mode === "watch" ? (
              <Eye className="h-4 w-4 text-brand-three" />
            ) : (
              <Sparkles className="h-4 w-4 text-brand" />
            )}
            {formTitle}
          </div>

          {mode === "watch" && (
            <p className="rounded-xl border border-brand-three/20 bg-brand-three/10 p-3 text-xs leading-relaxed text-cyan-100/80">
              {t("multiplayerSetup.watchExplainer")}
            </p>
          )}

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                {t("multiplayerSetup.nameLabel")}
              </span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isBusy && handleSubmit()}
                placeholder={t("multiplayerSetup.enterUsername")}
                maxLength={25}
                autoFocus
                className="h-12 rounded-xl border-white/10 bg-black/25 text-base text-white placeholder:text-white/25 focus-visible:ring-brand/50"
              />
            </label>

            {needsCode && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                  {t("multiplayerSetup.enterGameId")}
                </span>
                <Input
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  value={joinId}
                  onChange={(e) => setJoinId(normalizeRoomCode(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && !isBusy && handleSubmit()}
                  placeholder={"".padEnd(ROOM_CODE_LENGTH, "•")}
                  className="h-14 rounded-xl border-white/10 bg-black/25 text-center font-mono text-2xl font-semibold uppercase tracking-[0.35em] text-white placeholder:tracking-[0.35em] placeholder:text-white/15 focus-visible:ring-brand/50"
                />
                <span className="block text-center text-xs text-white/35">
                  {t("multiplayerSetup.codeHint", { length: ROOM_CODE_LENGTH })}
                </span>
              </label>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isBusy}
            className={`tap-scale h-12 w-full rounded-xl text-base font-semibold text-white hover:brightness-110 disabled:opacity-60 ${
              mode === "watch"
                ? "bg-gradient-to-r from-cyan-500 to-brand shadow-lg shadow-cyan-500/20"
                : "bg-gradient-to-r from-brand to-brand-two shadow-lg shadow-brand/25"
            }`}
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isBusy ? t("multiplayerSetup.connecting") : submitLabel}
          </Button>

          <button
            onClick={() => setMode("menu")}
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70 disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("multiplayerSetup.back")}
          </button>
        </div>
      )}
    </div>
  );
};
