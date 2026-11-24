import { Users, UserX } from "lucide-react";
import { Player } from "../../types/game";
import { useEffect, useState } from "react";
import { useSound } from "@/context/SoundContext";
import { useTranslation } from "react-i18next";

interface PlayerListProps {
  players: Player[];
  selectedPlayer?: string;
  onPlayerClick?: (playerId: string) => void;
  votingResults?: Record<string, string>;
  currentPlayerId?: string;
  speakingOrder?: boolean;
  showEliminated?: boolean;
  lastEliminatedId?: string;
  showScores?: boolean;
  tieBreakerPlayers?: string[];
}

/** Stable colour per player, so everyone's avatar looks the same to everyone. */
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

export const PlayerList = ({
  players,
  selectedPlayer,
  onPlayerClick,
  votingResults,
  currentPlayerId,
  speakingOrder,
  showEliminated,
  lastEliminatedId,
  showScores,
  tieBreakerPlayers = [],
}: PlayerListProps) => {
  const { playSound } = useSound();
  const { t } = useTranslation();

  // The player that is going to be eliminated (red highlight)
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setHighlightedPlayer(tieBreakerPlayers[0]);
    if (tieBreakerPlayers.length > 1 && lastEliminatedId) {
      setIsAnimating(true);
    }
  }, [tieBreakerPlayers, lastEliminatedId]);

  useEffect(() => {
    if (!isAnimating || tieBreakerPlayers.length <= 1) return;

    // Animate the elimination if there is a tie in votes
    let timeoutId: NodeJS.Timeout;
    let duration = 400;
    let iterations = 0;
    let currentIndex = 0;

    const animate = () => {
      // Switching between highlighting the players, who are in the tie breaker
      playSound("/sounds/click-sound.mp3");
      setHighlightedPlayer(tieBreakerPlayers[currentIndex]);
      currentIndex = (currentIndex + 1) % tieBreakerPlayers.length;
      iterations++;

      if (iterations < 10) {
        //Increase switching speed
        duration = Math.max(duration * 0.9, 200);
      } else {
        //Decrease switching speed
        duration = duration * 1.15;
      }

      if (duration > 800) {
        //Stay on the eliminated player
        setHighlightedPlayer(lastEliminatedId!);
        timeoutId = setTimeout(() => {
          setIsAnimating(false);
        }, 1500);
        return;
      }

      timeoutId = setTimeout(animate, duration);
    };

    animate();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAnimating, tieBreakerPlayers, lastEliminatedId]);

  const getVotesForPlayer = (playerId: string) => {
    if (!votingResults) return [];
    return Object.entries(votingResults)
      .filter(([_, targetId]) => targetId === playerId)
      .map(([voterId]) => players.find((p) => p.id === voterId)?.name || "");
  };

  const hasCurrentPlayerVoted = currentPlayerId && votingResults?.[currentPlayerId];
  const isCurrentPlayerEliminated = !players.some((player) => player.id === currentPlayerId);

  const filteredEliminatedPlayers = !showEliminated
    ? players.filter((p) => !p.isEliminated)
    : players;
  const displayPlayers = speakingOrder ? players : filteredEliminatedPlayers;

  const currentSpeakerIndex = speakingOrder
    ? displayPlayers.findIndex((p) => !p.submittedDescription)
    : 0;

  return (
    <section className="surface p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/40">
        <Users className="h-3.5 w-3.5" />
        <span>{t("playerList.players", { count: displayPlayers.length })}</span>
      </div>

      <ul className="space-y-2">
        {displayPlayers.map((player, index) => {
          if (
            !speakingOrder &&
            currentPlayerId &&
            !hasCurrentPlayerVoted &&
            player.id === currentPlayerId
          )
            return null;

          const votes = getVotesForPlayer(player.id);
          const showVotes = (hasCurrentPlayerVoted || isCurrentPlayerEliminated) && votes.length > 0;
          const isLastEliminated = player.id === lastEliminatedId;
          const isCurrentSpeaker = speakingOrder && index === currentSpeakerIndex;
          const isHighlighted = highlightedPlayer === player.id;
          const isSelected = selectedPlayer === player.id;
          const isMe = player.id === currentPlayerId;

          return (
            <li
              key={player.id}
              onClick={() => onPlayerClick?.(player.id)}
              className={[
                "relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
                onPlayerClick ? "cursor-pointer tap-scale" : "",
                isSelected
                  ? "border-brand/60 bg-brand/15 shadow-[0_0_0_1px_hsl(var(--brand)/0.4)]"
                  : isHighlighted
                    ? "border-destructive/70 bg-destructive/20"
                    : isLastEliminated && !votingResults
                      ? "border-brand-three/50 bg-brand-three/10"
                      : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]",
                player.isEliminated ? "opacity-45 saturate-50" : "",
              ].join(" ")}
            >
              {/* Speaker Indicator: used in WordReveal.tsx (discussion) */}
              {speakingOrder && (
                <div
                  className={[
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold transition-colors",
                    isCurrentSpeaker
                      ? "bg-gradient-to-br from-brand to-brand-two text-white animate-pulse-ring"
                      : "bg-white/[0.07] text-white/50",
                  ].join(" ")}
                >
                  {index + 1}
                </div>
              )}

              {!speakingOrder && (
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white/95 shadow-inner"
                  style={{ backgroundImage: avatarGradient(player.name) }}
                  aria-hidden
                >
                  {initials(player.name)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={[
                      "truncate font-semibold",
                      isCurrentSpeaker ? "text-white" : "text-white/90",
                    ].join(" ")}
                  >
                    {player.name}
                  </span>
                  {isMe && (
                    <span className="shrink-0 text-xs font-medium text-brand">
                      {t("common.you")}
                    </span>
                  )}
                </div>

                {/* Text or phrase the player has submitted this round */}
                {player.submittedDescription && (
                  <p className="mt-1 truncate text-sm italic text-white/55">
                    “{player.submittedDescription}”
                  </p>
                )}

                {/* Votes Overview: used in VotingScreen.tsx and Results.tsx */}
                {showVotes && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {votes.map((voterName, vIndex) => (
                      <span
                        key={vIndex}
                        className="rounded-full bg-brand/25 px-2 py-0.5 text-xs font-medium text-white/90"
                      >
                        {voterName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {player.isEliminated && player.role && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1">
                  <UserX className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-medium text-white/60">
                    {t(`roles.${player.role}`)}
                  </span>
                </div>
              )}

              {/* Scores Overview: used in GameSetup.tsx */}
              {showScores && (
                <div className="flex shrink-0 items-baseline gap-1 rounded-full bg-gold/15 px-2.5 py-1">
                  <span className="font-display text-sm font-bold text-gold">{player.score}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gold/70">
                    {t("playerList.points")}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
