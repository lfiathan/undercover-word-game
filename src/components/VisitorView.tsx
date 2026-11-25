import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { useTranslation } from "react-i18next";
import { Eye, Hourglass, Trophy, Users } from "lucide-react";
import { MrWhiteGuess } from "./shared/MrWhiteGuess";
import { SeatToggle } from "./shared/SeatToggle";
import { Player } from "../types/game";

/**
 * The visitor's screen.
 *
 * A visitor is blind on purpose: they see exactly what the table sees. No
 * secret words, no roles -- otherwise sitting out would be the best seat in
 * the room and anyone watching could quietly tip a player off. A role becomes
 * visible when its player is voted out, which is public anyway, and the whole
 * board opens up once the game is over.
 */

const roleStyles: Record<string, string> = {
  civilian: "bg-emerald-400/15 text-emerald-200",
  undercover: "bg-fuchsia-400/15 text-fuchsia-200",
  mrwhite: "bg-white/15 text-white",
  spectator: "bg-white/10 text-white/60",
};

const avatarGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${hash} 70% 58%), hsl(${(hash + 48) % 360} 72% 48%))`;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "?";

export const VisitorView = () => {
  const { gameState } = useGame();
  const { hostId } = usePeer();
  const { t } = useTranslation();

  const { players, phase, currentRound, votingResults, visitors } = gameState;
  const inLobby = phase === "setup" && currentRound === 0;
  const isOver = phase === "gameEnd";

  const phaseLabel = inLobby
    ? t("visitor.waiting")
    : phase === "voting"
      ? t("voting.inProgress")
      : phase === "results"
        ? t("results.title")
        : isOver
          ? t("gameEnd.title")
          : t("wordReveal.titleDiscussion");

  const votesFor = (playerId: string) =>
    Object.entries(votingResults ?? {})
      .filter(([, targetId]) => targetId === playerId)
      .map(([voterId]) => players.find((p) => p.id === voterId)?.name)
      .filter(Boolean) as string[];

  const votedFor = (playerId: string) => {
    const targetId = votingResults?.[playerId];
    if (!targetId) return null;
    return players.find((p) => p.id === targetId)?.name ?? null;
  };

  // Keep the speaking order when there is one: it is how players see the room.
  const ordered: Player[] = gameState.speakingOrder?.length
    ? [
        ...gameState.speakingOrder
          .map((id) => players.find((p) => p.id === id))
          .filter((p): p is Player => Boolean(p)),
        ...players.filter((p) => !gameState.speakingOrder?.includes(p.id)),
      ]
    : players;

  const eliminated = players.find((p) => p.id === gameState.lastEliminatedId);
  const showElimination = phase === "results" && eliminated;

  return (
    <div className="animate-fade-in space-y-5">
      <header className="space-y-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-three/30 bg-brand-three/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
          <Eye className="h-3.5 w-3.5" />
          {t("visitor.badge")}
        </span>
        <h2 className="font-display text-2xl font-bold text-white">{phaseLabel}</h2>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-white/40">
          {t("visitor.subtitle")}
        </p>
      </header>

      <SeatToggle />

      {inLobby && (
        <section className="surface flex flex-wrap items-center justify-center gap-2 p-5 text-sm text-white/45">
          <Hourglass className="h-4 w-4" />
          {t("visitor.waiting")}
          {hostId && (
            <span className="font-mono font-semibold tracking-widest text-white/70">
              {hostId}
            </span>
          )}
        </section>
      )}

      {/* Who just went out, and what they turned out to be: public either way. */}
      {showElimination && (
        <section className="surface-raised relative overflow-hidden p-6 text-center animate-pop-in">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-44 bg-gradient-to-b from-destructive/25 to-transparent blur-3xl" />
          <div className="relative space-y-2">
            <h3 className="font-display text-xl font-bold text-white">
              {t("results.eliminatedPlayer", { name: eliminated.name })}
            </h3>
            <p className="text-sm text-white/55">
              {t("results.theyWereA")}{" "}
              <span className="font-display text-lg font-bold text-white">
                {t(`roles.${eliminated.role}`)}
              </span>
            </p>
          </div>
        </section>
      )}

      {isOver && (
        <section className="relative overflow-hidden rounded-2xl p-7 text-center animate-pop-in">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.22),_transparent_65%)]" />
          <div className="relative space-y-3">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-gold/30 bg-gold/15">
              <Trophy className="h-8 w-8 text-gold" />
            </span>
            <h3 className="text-gradient font-display text-2xl font-extrabold">
              {gameState.winner === "civilian" && t("gameEnd.civilianWin")}
              {gameState.winner === "undercover" && t("gameEnd.undercoverWin")}
              {gameState.winner === "mrwhite" && t("gameEnd.mrWhiteWin")}
              {gameState.winner === "infiltrators" && t("gameEnd.infiltratorsWin")}
            </h3>
            <p className="font-mono text-sm text-white/60">
              {gameState.majorityWord}
              <span className="px-2 text-white/25">/</span>
              {gameState.undercoverWord}
            </p>
          </div>
        </section>
      )}

      <MrWhiteGuess />

      <section className="surface p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/40">
          <Users className="h-3.5 w-3.5" />
          <span>{t("playerList.players", { count: players.length })}</span>
        </div>

        <ul className="space-y-2">
          {ordered.map((player) => {
            const received = votesFor(player.id);
            const target = votedFor(player.id);
            // A role is public once its player is out, and at the end.
            const roleVisible = Boolean(player.role) && (player.isEliminated || isOver);

            return (
              <li
                key={player.id}
                className={`rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 ${
                  player.isEliminated ? "opacity-50 saturate-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white/95"
                    style={{ backgroundImage: avatarGradient(player.name) }}
                    aria-hidden
                  >
                    {initials(player.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-semibold text-white/90">
                        {player.name}
                      </span>
                      {roleVisible && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            roleStyles[player.role!] ?? roleStyles.spectator
                          }`}
                        >
                          {t(`roles.${player.role}`)}
                        </span>
                      )}
                      {player.isEliminated && (
                        <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-200">
                          {t("visitor.eliminated")}
                        </span>
                      )}
                    </div>

                    {/* Words stay hidden until the game is over. */}
                    {isOver && player.word && (
                      <p className="mt-1 font-mono text-sm text-white/60">{player.word}</p>
                    )}
                  </div>
                </div>

                {(player.submittedDescription || target || received.length > 0) && (
                  <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
                    {player.submittedDescription && (
                      <p className="truncate text-sm italic text-white/55">
                        “{player.submittedDescription}”
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {target && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/60">
                          {t("visitor.votedFor", { name: target })}
                        </span>
                      )}
                      {received.length > 0 && (
                        <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-rose-200">
                          {t("visitor.votesReceived", { count: received.length })}
                          {": "}
                          {received.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {visitors && visitors.length > 0 && (
        <section className="surface p-4">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            <Eye className="h-3.5 w-3.5" />
            <span>{t("playerList.watching", { count: visitors.length })}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visitors.map((visitor) => (
              <span
                key={visitor.id}
                className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/60"
              >
                {visitor.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
