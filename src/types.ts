// ── Quiz data structures ──────────────────────────────────────────────────────

export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  /** Defaults to 'multiple-choice' when absent (backwards compat with old saved quizzes) */
  type?: 'multiple-choice' | 'multiple-answer';
  answers: Answer[];
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

// ── Game state ────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface Score {
  name: string;
  score: number;
  rank: number;
}

export type GameStatus = 'lobby' | 'question' | 'results' | 'leaderboard' | 'ended';

// ── WebSocket messages ────────────────────────────────────────────────────────

// Server → Participants
export type ServerMessage =
  | { type: 'welcome'; players: string[] }
  | { type: 'player_joined'; players: string[] }
  | { type: 'question_start'; question: Question; index: number; total: number }
  | { type: 'all_answered'; correctAnswerIds: string[]; leaderboard: Score[] }
  | { type: 'quiz_ended'; leaderboard: Score[] }
  | { type: 'error'; message: string };

// Participant → Server
export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'answer'; questionId: string; answerIds: string[]; timestamp: number };

// Server → Admin (internal events emitted from GameServer)
export type AdminEvent =
  | { type: 'player_joined'; players: Player[] }
  | { type: 'answer_received'; playerId: string; remaining: number }
  | { type: 'all_answered'; leaderboard: Score[] };
