import React, { createContext, useContext, useState } from "react";
import { GameState, Player, GamePhase, PlayerRole, RoleDistribution, Visitor } from "../types/game";
import { toast } from "sonner";
import { calculateDefaultDistribution } from "../config/roleDistribution";
import { useTranslation } from "react-i18next";
import { shuffle } from "@/lib/utils";
import { resolveWordLanguage } from "@/config/wordLanguages";

interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addPlayer: (name: string, id: string) => void;
  removePlayer: (id: string) => void;
  addVisitor: (name: string, id: string) => void;
  removeVisitor: (id: string) => void;
  setPlayerSeat: (id: string, name: string, asVisitor: boolean) => void;
  startGame: () => void;
  setPhase: (phase: GamePhase) => void;
  submitVote: (voterId: string, targetId: string) => void;
  submitMrWhiteGuess: (guess: string) => void;
  submitDescription: (playerId: string, description: string) => void;
  resetGame: () => void;
  updateRoleDistribution: (distribution: RoleDistribution) => void;
  setWordLanguage: (language: string) => void;
  checkGameEnd: (players: Player[]) => string | null;
  eliminatePlayer: (eliminatedId: string) => void;
  rerollWords: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const { t, i18n } = useTranslation();

  const [gameState, setGameState] = useState<GameState>(() => ({
    players: [],
    phase: "setup",
    currentRound: 0,
    majorityWord: "",
    undercoverWord: "",
    mrWhiteGuess: undefined,
    roleDistribution: calculateDefaultDistribution(4),
    // Start on the pack matching the host's own language; they can change it.
    wordLanguage: resolveWordLanguage(i18n.resolvedLanguage ?? i18n.language),
    visitors: [],
  }));

  const addPlayer = (name: string, id: string) => {
    setGameState((prev) => {
      if (prev.players.length >= 10) {
        toast.error(t("gameSetup.maxPlayers"));
        return prev;
      }

      const score = 0;
      let role = undefined;
      let isEliminated = undefined;
      if (prev.phase !== "setup") {
        role = "spectator";
        isEliminated = true;
      }

      const newPlayers = [...prev.players, { id, name, role, isEliminated, score }];
      return {
        ...prev,
        players: newPlayers,
        roleDistribution: calculateDefaultDistribution(newPlayers.length),
      };
    });
  };

  const addVisitor = (name: string, id: string) => {
    setGameState((prev) => {
      if (prev.visitors?.some((v) => v.id === id)) return prev;
      const visitor: Visitor = { id, name };
      return { ...prev, visitors: [...(prev.visitors ?? []), visitor] };
    });
  };

  const removeVisitor = (id: string) => {
    setGameState((prev) => {
      if (!prev.visitors?.some((v) => v.id === id)) return prev;
      return { ...prev, visitors: prev.visitors.filter((v) => v.id !== id) };
    });
  };

  /**
   * Move someone between playing and watching. Only between games: once
   * words are dealt, a seat change would mean handing out or taking back a
   * role mid-round.
   */
  const setPlayerSeat = (id: string, name: string, asVisitor: boolean) => {
    setGameState((prev) => {
      if (prev.phase !== "setup") return prev;
      const visitors = prev.visitors ?? [];

      if (asVisitor) {
        if (visitors.some((v) => v.id === id)) return prev;
        const players = prev.players.filter((p) => p.id !== id);
        return {
          ...prev,
          players,
          visitors: [...visitors, { id, name }],
          roleDistribution: calculateDefaultDistribution(players.length),
        };
      }

      if (prev.players.some((p) => p.id === id)) return prev;
      if (prev.players.length >= 10) {
        toast.error(t("gameSetup.maxPlayers"));
        return prev;
      }
      const players = [...prev.players, { id, name, score: 0 }];
      return {
        ...prev,
        players,
        visitors: visitors.filter((v) => v.id !== id),
        roleDistribution: calculateDefaultDistribution(players.length),
      };
    });
  };

  const removePlayer = (id: string) => {
    setGameState((prev) => {
      const player = prev.players.find(p => p.id === id);
      if (!player) return prev;

      const newPlayers = prev.players.filter(p => p.id !== id);
      const newSpeakingOrder = prev.speakingOrder?.filter(s => s !== id);

      if (prev.phase !== "setup") {
        const gameEnd = checkGameEnd(newPlayers);
        if (gameEnd) {
          return {
            ...prev,
            phase: "gameEnd",
            winner: gameEnd,
            players: newPlayers,
            speakingOrder: newSpeakingOrder,
          };
        }
      }

      return resolveVotesIfComplete({
        ...prev,
        players: newPlayers,
        speakingOrder: newSpeakingOrder,
      });
    });
  };

  const generateSpeakingOrder = (players: Player[]) => {
    const activePlayers = players.filter(p => !p.isEliminated);
    const nonWhitePlayers = activePlayers.filter(p => p.role !== "mrwhite");

    // Ensure the first player is not a Mr. White
    const firstPlayer = nonWhitePlayers[Math.floor(Math.random() * nonWhitePlayers.length)];

    const remainingPlayers = activePlayers.filter(p => p.id !== firstPlayer.id);
    const shuffledRemaining = shuffle(remainingPlayers);

    return [firstPlayer, ...shuffledRemaining].map(player => player.id);
  };

  const checkGameEnd = (players: Player[]) => {
    const alivePlayers = players.filter(p => !p.isEliminated);
    const aliveCivilians = alivePlayers.filter(p => p.role === "civilian");
    const aliveUndercovers = alivePlayers.filter(p => p.role === "undercover");
    const aliveMrWhites = alivePlayers.filter(p => p.role === "mrwhite");

    if (aliveUndercovers.length === 0 && aliveMrWhites.length === 0) {
      if (aliveCivilians.length === 0) return null;
      return "civilian";
    }

    if (aliveCivilians.length <= 1) {
      if (aliveUndercovers.length > 0) {
        if (aliveMrWhites.length > 0) {
          return "infiltrators";
        }
        return "undercover";
      }
      return "mrwhite";
    }

    return null;
  };

  const generateAndAssignWords = (players: Player[], wordLanguage: string) => {
    const lng = resolveWordLanguage(wordLanguage);
    const wordPairs = t("wordPairs", { lng, returnObjects: true }) as [string, string][];
    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    const [majorityWord, undercoverWord] = randomPair;

    const updatedPlayers = players.map(player => ({
      ...player,
      word: player.role === "mrwhite" ? "" : player.role === "undercover" ? undercoverWord : majorityWord,
      submittedDescription: undefined,
    }));

    return {
      players: updatedPlayers,
      majorityWord,
      undercoverWord,
    };
  };

  const rerollWords = () => {
    setGameState(prev => {
      if (prev.currentRound !== 1) return prev;

      const { players, majorityWord, undercoverWord } = generateAndAssignWords(
        prev.players,
        prev.wordLanguage,
      );
      return {
        ...prev,
        players,
        majorityWord,
        undercoverWord,
      };
    });
  };

  const startGame = () => {
    setGameState((prev) => {
      if (prev.currentRound === 0) {
        if (prev.players.length < 4) {
          toast.error(t("gameSetup.atLeastFourPlayers"));
          return prev;
        }

        const shuffledPlayers = shuffle(prev.players);
        const { undercovers, mrWhites } = prev.roleDistribution;

        const playersWithRoles = shuffledPlayers.map((player, index) => {
          let role: PlayerRole = "civilian";
          if (index < mrWhites) {
            role = "mrwhite";
          } else if (index < mrWhites + undercovers) {
            role = "undercover";
          }

          return {
            ...player,
            role,
            isEliminated: false,
          };
        });

        const { players, majorityWord, undercoverWord } = generateAndAssignWords(
          playersWithRoles,
          prev.wordLanguage,
        );
        const speakingOrder = generateSpeakingOrder(players);

        return {
          ...prev,
          players,
          speakingOrder,
          phase: "wordReveal",
          majorityWord,
          undercoverWord,
          currentRound: 1,
          mrWhiteGuess: undefined,
        };
      } else {
        return {
          ...prev,
          speakingOrder: generateSpeakingOrder(prev.players),
          phase: "wordReveal",
          votingResults: {},
          currentRound: prev.currentRound + 1,
          mrWhiteGuess: undefined,
        };
      }
    });
  };

  const setPhase = (phase: GamePhase) => {
    setGameState((prev) => ({ ...prev, phase }));
  };

  const submitDescription = (playerId: string, submittedDescription: string) => {
    setGameState((prev) => {
      const updatedPlayers = prev.players.map(p =>
        p.id === playerId ? { ...p, submittedDescription } : p
      );

      return {
        ...prev,
        players: updatedPlayers,
      };
    });
  };

  /**
   * Close the vote once everyone still in the round has voted.
   *
   * Run after each vote AND whenever a player leaves: a player dropping out
   * mid-vote used to leave the round waiting forever for a vote that could
   * never arrive. Votes cast by or for someone who is gone are dropped, so a
   * ghost vote cannot decide the elimination either.
   */
  const resolveVotesIfComplete = (state: GameState): GameState => {
    if (state.phase !== "voting") return state;

    const activePlayers = state.players.filter((p) => !p.isEliminated);
    if (activePlayers.length === 0) return state;

    const liveIds = new Set(activePlayers.map((p) => p.id));
    // A vote from someone who has left does not count. A vote *for* someone
    // who has left still counts as having voted -- it just cannot elect
    // anyone, since that player is already out of the round.
    const votes = Object.fromEntries(
      Object.entries(state.votingResults ?? {}).filter(([voterId]) =>
        liveIds.has(voterId),
      ),
    );

    if (!activePlayers.every((p) => p.id in votes)) {
      return { ...state, votingResults: votes };
    }

    const voteCount: Record<string, number> = {};
    Object.values(votes).forEach((id) => {
      if (liveIds.has(id)) voteCount[id] = (voteCount[id] || 0) + 1;
    });

    // Everyone voted, but only for players who have since left: there is
    // nobody left to eliminate, so the round simply ends.
    if (Object.keys(voteCount).length === 0) {
      return { ...state, votingResults: {}, phase: "discussion" };
    }

    const maxVotes = Math.max(...Object.values(voteCount));
    const mostVotedPlayers = Object.entries(voteCount)
      .filter(([, count]) => count === maxVotes)
      .map(([id]) => id);

    const eliminatedId =
      mostVotedPlayers[Math.floor(Math.random() * mostVotedPlayers.length)];

    return {
      ...state,
      votingResults: votes,
      phase: "results",
      lastEliminatedId: eliminatedId,
    };
  };

  const submitVote = (voterId: string, targetId: string) => {
    setGameState((prev) =>
      resolveVotesIfComplete({
        ...prev,
        votingResults: { ...(prev.votingResults || {}), [voterId]: targetId },
      }),
    );
  };

  const eliminatePlayer = (eliminatedId: string) => {
    setGameState((prev) => {
      const updatedPlayers = prev.players.map(p =>
        p.id === eliminatedId ? { ...p, isEliminated: true, submittedDescription: undefined } : { ...p, submittedDescription: undefined }
      );

      return {
        ...prev,
        players: updatedPlayers,
        phase: "results",
        lastEliminatedId: eliminatedId,
      };
    });
  };

  const submitMrWhiteGuess = (guess: string) => {
    setGameState((prev) => {
      if (guess.toLowerCase() === prev.majorityWord.toLowerCase()) {
        return {
          ...prev,
          phase: "gameEnd",
          winner: "mrwhite",
          mrWhiteGuess: guess
        };
      } else {
        const gameWinner = checkGameEnd(prev.players);
        return {
          ...prev,
          phase: gameWinner ? "gameEnd" : "results",
          winner: gameWinner || undefined,
          mrWhiteGuess: guess
        };
      }
    });
  };

  const resetGame = () => {
    setGameState((prev) => {
      const players = prev.players.map(p => ({ ...p, isEliminated: false, submittedDescription: undefined }));
      return {
        players: players,
        phase: "setup",
        currentRound: 0,
        majorityWord: "",
        undercoverWord: "",
        mrWhiteGuess: undefined,
        roleDistribution: prev.roleDistribution,
        wordLanguage: prev.wordLanguage,
        visitors: prev.visitors ?? [],
      };
    });
  };

  const setWordLanguage = (language: string) => {
    setGameState(prev =>
      prev.wordLanguage === resolveWordLanguage(language)
        ? prev
        : { ...prev, wordLanguage: resolveWordLanguage(language) },
    );
  };

  const updateRoleDistribution = (distribution: RoleDistribution) => {
    setGameState(prev => ({
      ...prev,
      roleDistribution: distribution
    }));
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        addPlayer,
        removePlayer,
        addVisitor,
        removeVisitor,
        setPlayerSeat,
        startGame,
        setPhase,
        submitVote,
        submitMrWhiteGuess,
        submitDescription,
        resetGame,
        updateRoleDistribution,
        setWordLanguage,
        checkGameEnd,
        eliminatePlayer,
        rerollWords,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};