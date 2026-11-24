import { useEffect, useState } from "react";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, UserPlus, Loader2 } from "lucide-react";
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

  return (
    <Card className="max-w-md mx-auto p-6 space-y-6 animate-fade-in glass-morphism">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center text-gradient">{t("welcome")}</h2>

        {!showHostForm && !showJoinForm && (
          <div className="space-y-4">
            <Button
              onClick={() => setShowHostForm(true)}
              className="w-full bg-primary hover:bg-primary/90 transition-colors duration-200"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t("multiplayerSetup.hostNewGame")}
            </Button>

            <div className="relative flex items-center">
              <span className="flex-grow border-t border-white/10"></span>
              <span className="px-4 text-xs uppercase text-muted-foreground">
                {t("multiplayerSetup.joinExistingGame")}
              </span>
              <span className="flex-grow border-t border-white/10"></span>
            </div>

            <Button
              onClick={() => setShowJoinForm(true)}
              className="w-full bg-secondary hover:bg-secondary/90 transition-colors duration-200"
            >
              <Users className="mr-2 h-4 w-4" />
              {t("multiplayerSetup.joinGame")}
            </Button>
          </div>
        )}

        {showHostForm && (
          <div className="space-y-4 animate-fade-in">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isBusy && handleHost()}
              placeholder={t("multiplayerSetup.enterUsername")}
              maxLength={25}
              autoFocus
              className="w-full bg-secondary/20 border-secondary/30"
            />
            <Button
              onClick={handleHost}
              disabled={isBusy}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBusy ? t("multiplayerSetup.connecting") : t("multiplayerSetup.startHosting")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowHostForm(false)}
              disabled={isBusy}
              className="w-full"
            >
              {t("multiplayerSetup.back")}
            </Button>
          </div>
        )}

        {showJoinForm && (
          <div className="space-y-4 animate-fade-in">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("multiplayerSetup.enterUsername")}
              maxLength={25}
              autoFocus
              className="w-full bg-secondary/20 border-secondary/30"
            />
            <div className="space-y-1">
              <Input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={joinId}
                onChange={(e) => setJoinId(normalizeRoomCode(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && !isBusy && handleJoin()}
                placeholder={t("multiplayerSetup.enterGameId")}
                className="w-full bg-secondary/20 border-secondary/30 text-center font-mono text-xl tracking-[0.3em] uppercase"
              />
              <p className="text-center text-xs text-muted-foreground">
                {t("multiplayerSetup.codeHint", { length: ROOM_CODE_LENGTH })}
              </p>
            </div>
            <Button
              onClick={handleJoin}
              disabled={isBusy}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBusy ? t("multiplayerSetup.connecting") : t("multiplayerSetup.joinGame")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowJoinForm(false)}
              disabled={isBusy}
              className="w-full"
            >
              {t("multiplayerSetup.back")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
