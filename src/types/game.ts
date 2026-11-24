export type PlayerRole = "civilian" | "undercover" | "mrwhite" | "spectator";

export type RoleDistribution = {
  undercovers: number;
  mrWhites: number;
};

export type Player = {
  id: string;
  name: string;
  word?: string;
  role?: PlayerRole;
  isEliminated?: boolean;
  score?: number;
  submittedDescription?: string;
};

/**
 * Someone in the room who is not playing: no word, no role, no vote, and not
 * counted towards the player total. They see everything (see VisitorView),
 * which is why players are always shown who is watching.
 */
export type Visitor = {
  id: string;
  name: string;
};

export type GamePhase = "setup" | "wordReveal" | "discussion" | "voting" | "results" | "gameEnd";

export type GameState = {
  players: Player[];
  phase: GamePhase;
  currentRound: number;
  majorityWord: string;
  undercoverWord: string;
  votingResults?: Record<string, string>;
  speakingOrder?: string[];
  lastEliminatedId?: string;
  winner?: string;
  mrWhiteGuess?: string;
  roleDistribution: RoleDistribution;
  /** Which word pack the host deals secret words from (see config/wordLanguages). */
  wordLanguage: string;
  /** People watching the room without taking a seat. */
  visitors: Visitor[];
};