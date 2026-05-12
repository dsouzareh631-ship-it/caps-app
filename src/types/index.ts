export interface User {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  createdAt: number;
  totalCaps: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  currentWinStreak: number;
  bestWinStreak: number;
}

export interface Game {
  id: string;
  userId: string;
  date: number;
  capsMade: number;
  bounces: number;
  rebuttals: number;
  result: 'win' | 'loss';
  notes: string;
  players: string[];
  status: 'pending' | 'verified' | 'rejected';
  approvals: string[];
  rejections: string[];
  createdAt: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  totalCaps: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  capsPerGame: number;
}
