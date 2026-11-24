import { useEffect, useState } from "react";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Loader2, LogIn, Sparkles, UserPlus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@/lib/roomCode";

export const MultiplayerSetup = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { hostGame, joinGame, isBusy } = usePeer();
  const [showJoinForm, setShowJoinForm] = useState(searchParams.get("gameId") != undefined);
  const [showHostForm, setShowHostForm] = useState(false);
  const [joinId, setJoinId] = useState(
    normalizeRoomCode(searchParams.get("gameId") ?? ""),
  );
  const [username, setUsername] = useState("");

  useEffect(() => {
    const gameId = searchParams.get("gameId");
    if (gameId) {
      setJoinId(normalizeRoomCode(gameId));
      setShowJoinForm(true);
    }
  }, [searchParams]);

  const handleJoin = () => {
    if (!username.trim()) {
      toast.error(t("multiplayerSetup.enterUsernameError"));
      return;
    }
    if (joinId.length !== ROOM_CODE_LENGTH) {
      toast.error(t("multiplayerSetup.enterGameIdError"));
      return;
    }
    joinGame(joinId, username.trim());
  };

  const handleHost = () => {
    if (!username.trim()) {
      toast.error(t("multiplayerSetup.enterUsernameError"));
      return;
    }
    hostGame(username.trim());
  };

  const showMenu = !showHostForm && !showJoinForm;

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

      {showMenu && (
        <div className="space-y-3 animate-pop-in">
          <button
            onClick={() => setShowHostForm(true)}
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
            onClick={() => setShowJoinForm(true)}
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
        </div>
      )}

      {(showHostForm || showJoinForm) && (
        <div className="surface animate-pop-in space-y-5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Sparkles className="h-4 w-4 text-brand" />
            {showHostForm
              ? t("multiplayerSetup.hostNewGame")
              : t("multiplayerSetup.joinGame")}
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                {t("multiplayerSetup.nameLabel")}
              </span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !isBusy &&
                  (showHostForm ? handleHost() : handleJoin())
                }
                placeholder={t("multiplayerSetup.enterUsername")}
                maxLength={25}
                autoFocus
                className="h-12 rounded-xl border-white/10 bg-black/25 text-base text-white placeholder:text-white/25 focus-visible:ring-brand/50"
              />
            </label>

            {showJoinForm && (
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
                  onKeyDown={(e) => e.key === "Enter" && !isBusy && handleJoin()}
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
            onClick={showHostForm ? handleHost : handleJoin}
            disabled={isBusy}
            className="tap-scale h-12 w-full rounded-xl bg-gradient-to-r from-brand to-brand-two text-base font-semibold text-white shadow-lg shadow-brand/25 hover:brightness-110 disabled:opacity-60"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isBusy
              ? t("multiplayerSetup.connecting")
              : showHostForm
                ? t("multiplayerSetup.startHosting")
                : t("multiplayerSetup.joinGame")}
          </Button>

          <button
            onClick={() => {
              setShowHostForm(false);
              setShowJoinForm(false);
            }}
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
