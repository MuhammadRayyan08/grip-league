export type GameType = "RESPIRATORY" | "GASTRO";

export type LifelineType = "SKIP" | "FIFTY_FIFTY" | "AUDIENCE_HELP";

export type RoundType = "ROUND_1" | "ROUND_2" | "TIE_BREAKER" | "AUDIENCE";

export interface Team {
  id: string;
  name: string;
  logo?: string;
  score: number;
  lifelinesRemaining: number;
  usedLifelines: LifelineType[];
}

export interface Question {
  id: string;
  text: string;
  options: string[]; 
  correctAnswer: number; 
  category?: string;
  imageUrl?: string;
}

export interface AudienceQuestion {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: number;
}

export interface SavedGame {
  id: string;
  title: string;
  gameType: GameType;
  dateCreated: string;
  numberOfTeams: number;
  teams: Omit<Team, "score" | "lifelinesRemaining" | "usedLifelines">[];
  round1Questions: Question[];
  round2Questions: Question[];
  audienceQuestions: AudienceQuestion[];
  tieBreakerQuestions: Question[];
  skipQuestions?: Question[]; 
  lastPlayedDate?: string;
  highestScore?: {
    teamName: string;
    teamLogo?: string;
    score: number;
    date: string;
  };
}

export interface GameSession {
  gameId: string;
  currentRound: RoundType;
  currentTeamIndex: number;
  currentQuestionIndex: number;
  teams: Team[];
  buzzerLocked: boolean;
  buzzerPressedBy?: string; 
  timerActive: boolean;
  timerRemaining: number;
}

export interface BuzzerEvent {
  teamId: string;
  timestamp: number;
}

export type TieBreakerMode = "SUDDEN_DEATH" | "ONE_PER_TEAM" | "RAPID_FIRE";
