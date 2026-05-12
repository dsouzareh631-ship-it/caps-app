import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  updateDoc,
  addDoc,
  increment,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Game, LeaderboardEntry, User } from '../types';

export async function updateUserProfile(uid: string, fields: { displayName: string; username: string }) {
  await updateDoc(doc(db, 'users', uid), fields);
}

export async function getGameById(gameId: string): Promise<Game | null> {
  const snap = await getDoc(doc(db, 'games', gameId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null;
}

export async function getHeadToHead(myUid: string, theirUid: string): Promise<{ wins: number; losses: number }> {
  const snap = await getDocs(
    query(
      collection(db, 'games'),
      where('userId', '==', myUid),
      where('players', 'array-contains', theirUid),
      where('status', '==', 'verified')
    )
  );
  let wins = 0, losses = 0;
  for (const d of snap.docs) {
    const g = d.data() as Game;
    if (g.result === 'win') wins++; else losses++;
  }
  return { wins, losses };
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data() as User);
}

export async function getRecentTeammates(userId: string, limit = 5): Promise<User[]> {
  const snap = await getDocs(
    query(collection(db, 'games'), where('userId', '==', userId), orderBy('date', 'desc'))
  );
  const seenUids = new Set<string>();
  const recentUids: string[] = [];
  for (const d of snap.docs) {
    const g = d.data() as Game;
    for (const pid of g.players) {
      if (pid !== userId && !seenUids.has(pid)) {
        seenUids.add(pid);
        recentUids.push(pid);
        if (recentUids.length >= limit) break;
      }
    }
    if (recentUids.length >= limit) break;
  }
  const users = await Promise.all(recentUids.map((uid) => getUser(uid)));
  return users.filter(Boolean) as User[];
}

export async function logGame(
  userId: string,
  players: string[],
  capsMade: number,
  bounces: number,
  rebuttals: number,
  result: 'win' | 'loss',
  notes: string,
  date: number
): Promise<string> {
  const ref = await addDoc(collection(db, 'games'), {
    userId,
    players,
    capsMade,
    bounces,
    rebuttals,
    result,
    notes,
    date,
    status: 'pending',
    approvals: [],
    rejections: [],
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function approveGame(gameId: string, approverId: string) {
  const gameRef = doc(db, 'games', gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return;

  const game = snap.data() as Game;
  if (game.status !== 'pending') return;

  await updateDoc(gameRef, {
    status: 'verified',
    approvals: arrayUnion(approverId),
  });

  // Update the game owner's aggregate stats + win streak
  const userRef = doc(db, 'users', game.userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as User;

  if (game.result === 'win') {
    const newStreak = (userData.currentWinStreak ?? 0) + 1;
    await updateDoc(userRef, {
      totalCaps: increment(game.capsMade + game.bounces + (game.rebuttals ?? 0)),
      totalGames: increment(1),
      totalWins: increment(1),
      currentWinStreak: newStreak,
      bestWinStreak: Math.max(newStreak, userData.bestWinStreak ?? 0),
    });
  } else {
    await updateDoc(userRef, {
      totalCaps: increment(game.capsMade + game.bounces + (game.rebuttals ?? 0)),
      totalGames: increment(1),
      totalLosses: increment(1),
      currentWinStreak: 0,
    });
  }
}

export async function rejectGame(gameId: string, rejectorId: string) {
  const gameRef = doc(db, 'games', gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return;

  const game = snap.data() as Game;
  if (game.status !== 'pending') return;

  const newRejections = [...game.rejections, rejectorId];
  // Reject only if all tagged players (excluding the logger) have rejected
  const otherPlayers = game.players.filter((p) => p !== game.userId);
  const allRejected = otherPlayers.every((p) => newRejections.includes(p));

  await updateDoc(gameRef, {
    rejections: arrayUnion(rejectorId),
    ...(allRejected ? { status: 'rejected' } : {}),
  });
}

export async function getUserGames(userId: string): Promise<Game[]> {
  const snap = await getDocs(
    query(collection(db, 'games'), where('userId', '==', userId), orderBy('date', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Game));
}

export async function getPendingVerifications(userId: string): Promise<Game[]> {
  const snap = await getDocs(
    query(
      collection(db, 'games'),
      where('players', 'array-contains', userId),
      where('status', '==', 'pending')
    )
  );
  // Exclude games the user logged themselves
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Game))
    .filter((g) => g.userId !== userId);
}

export async function getAllTimeLeaderboard(): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('totalCaps', 'desc')));
  return snap.docs.map((d) => {
    const u = d.data() as User;
    return {
      uid: u.uid,
      displayName: u.displayName,
      username: u.username,
      totalCaps: u.totalCaps,
      totalGames: u.totalGames,
      totalWins: u.totalWins,
      totalLosses: u.totalLosses,
      capsPerGame: u.totalGames > 0 ? u.totalCaps / u.totalGames : 0,
    };
  });
}

export async function getPeriodLeaderboard(since: number): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, 'games'),
      where('status', '==', 'verified'),
      where('date', '>=', since)
    )
  );

  const games = snap.docs.map((d) => d.data() as Game);

  // Aggregate by userId
  const map = new Map<string, { caps: number; games: number; wins: number; losses: number }>();
  for (const g of games) {
    const existing = map.get(g.userId) ?? { caps: 0, games: 0, wins: 0, losses: 0 };
    map.set(g.userId, {
      caps: existing.caps + g.capsMade + g.bounces,
      games: existing.games + 1,
      wins: existing.wins + (g.result === 'win' ? 1 : 0),
      losses: existing.losses + (g.result === 'loss' ? 1 : 0),
    });
  }

  // Fetch user display info in parallel
  const userIds = Array.from(map.keys());
  const users = await Promise.all(userIds.map((uid) => getUser(uid)));
  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const user = users[i];
    if (!user) continue;
    const uid = userIds[i];
    const stats = map.get(uid)!;
    entries.push({
      uid,
      displayName: user.displayName,
      username: user.username,
      totalCaps: stats.caps,
      totalGames: stats.games,
      totalWins: stats.wins,
      totalLosses: stats.losses,
      capsPerGame: stats.games > 0 ? stats.caps / stats.games : 0,
    });
  }

  return entries.sort((a, b) => b.totalCaps - a.totalCaps);
}

export interface Achievements {
  mrRebuttal: { username: string; displayName: string; total: number } | null;
  bounceMerchant: { username: string; displayName: string; total: number } | null;
  hotStreak: { username: string; displayName: string; total: number } | null;
  sharpShooter: { username: string; displayName: string; total: number } | null;
  ironman: { username: string; displayName: string; total: number } | null;
}

export async function getAchievements(): Promise<Achievements> {
  const snap = await getDocs(
    query(collection(db, 'games'), where('status', '==', 'verified'))
  );

  const rebuttalsMap = new Map<string, number>();
  const bouncesMap = new Map<string, number>();

  for (const d of snap.docs) {
    const g = d.data() as Game;
    rebuttalsMap.set(g.userId, (rebuttalsMap.get(g.userId) ?? 0) + (g.rebuttals ?? 0));
    bouncesMap.set(g.userId, (bouncesMap.get(g.userId) ?? 0) + (g.bounces ?? 0));
  }

  async function topUser(map: Map<string, number>) {
    if (map.size === 0) return null;
    const [topUid, total] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
    const user = await getUser(topUid);
    if (!user) return null;
    return { username: user.username, displayName: user.displayName, total };
  }

  const [mrRebuttal, bounceMerchant] = await Promise.all([
    topUser(rebuttalsMap),
    topUser(bouncesMap),
  ]);

  // Achievements from users collection
  const usersSnap = await getDocs(collection(db, 'users'));
  const allUsers = usersSnap.docs.map((d) => d.data() as User);

  function topUserFrom(pick: (u: User) => number, minGames = 0) {
    const eligible = allUsers.filter((u) => (u.totalGames ?? 0) >= minGames);
    if (eligible.length === 0) return null;
    const best = eligible.reduce((a, b) => (pick(a) >= pick(b) ? a : b));
    const val = pick(best);
    if (val <= 0) return null;
    return { username: best.username, displayName: best.displayName, total: val };
  }

  const hotStreak = topUserFrom((u) => u.currentWinStreak ?? 0);
  const sharpShooter = topUserFrom(
    (u) => Math.round((u.totalCaps / u.totalGames) * 10) / 10,
    3
  );
  const ironman = topUserFrom((u) => u.totalGames ?? 0);

  return { mrRebuttal, bounceMerchant, hotStreak, sharpShooter, ironman };
}
