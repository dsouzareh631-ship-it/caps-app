import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Game, Group, LeaderboardEntry, User } from '../types';

function randomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export async function createGroup(name: string, userId: string): Promise<Group> {
  const code = randomCode();
  const ref = doc(collection(db, 'groups'));
  const group: Group = { id: ref.id, name, code, createdBy: userId, members: [userId], createdAt: Date.now() };
  await setDoc(ref, group);
  await updateDoc(doc(db, 'users', userId), { groupIds: arrayUnion(ref.id) });
  return group;
}

export async function joinGroupByCode(code: string, userId: string): Promise<Group> {
  const snap = await getDocs(query(collection(db, 'groups'), where('code', '==', code.toUpperCase())));
  if (snap.empty) throw new Error('No group found with that code.');
  const groupDoc = snap.docs[0];
  const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
  if (group.members.includes(userId)) throw new Error('You are already in this group.');
  await updateDoc(doc(db, 'groups', group.id), { members: arrayUnion(userId) });
  await updateDoc(doc(db, 'users', userId), { groupIds: arrayUnion(group.id) });
  return { ...group, members: [...group.members, userId] };
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const user = await getUser(userId);
  if (!user || !user.groupIds?.length) return [];
  const groups = await Promise.all(user.groupIds.map(async (id) => {
    const snap = await getDoc(doc(db, 'groups', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
  }));
  return groups.filter(Boolean) as Group[];
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Group not found.');

  const group = groupSnap.data() as Group;
  const remainingMembers = group.members.filter((uid) => uid !== userId);

  await updateDoc(doc(db, 'users', userId), { groupIds: arrayRemove(groupId) });

  if (remainingMembers.length === 0) {
    await deleteDoc(groupRef);
  } else {
    await updateDoc(groupRef, { members: remainingMembers });
  }
}

export async function getGroupMembers(memberIds: string[]): Promise<User[]> {
  const users = await Promise.all(memberIds.map((uid) => getUser(uid)));
  return users.filter(Boolean) as User[];
}

export async function getGroupLeaderboard(memberIds: string[]): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'games'), where('status', '==', 'verified'))
  );
  const memberSet = new Set(memberIds);
  const games = snap.docs
    .map((d) => d.data() as Game)
    .filter((g) => memberSet.has(g.userId) && g.players.some((uid) => uid !== g.userId && memberSet.has(uid)));

  const map = new Map<string, { caps: number; games: number; wins: number; losses: number }>();
  for (const g of games) {
    const existing = map.get(g.userId) ?? { caps: 0, games: 0, wins: 0, losses: 0 };
    map.set(g.userId, {
      caps: existing.caps + g.capsMade + g.bounces + (g.rebuttals ?? 0) + (g.floaters ?? 0) + (g.gameWinners ?? 0),
      games: existing.games + 1,
      wins: existing.wins + (g.result === 'win' ? 1 : 0),
      losses: existing.losses + (g.result === 'loss' ? 1 : 0),
    });
  }

  const userIds = Array.from(map.keys());
  const users = await Promise.all(userIds.map((uid) => getUser(uid)));
  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const user = users[i];
    if (!user) continue;
    const stats = map.get(userIds[i])!;
    entries.push({
      uid: userIds[i],
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL,
      totalCaps: stats.caps,
      totalGames: stats.games,
      totalWins: stats.wins,
      totalLosses: stats.losses,
      capsPerGame: stats.games > 0 ? stats.caps / stats.games : 0,
    });
  }
  return entries.sort((a, b) => b.totalCaps - a.totalCaps);
}

export async function getGroupPeriodLeaderboard(memberIds: string[], since: number): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'games'), where('status', '==', 'verified'), where('date', '>=', since))
  );
  const memberSet = new Set(memberIds);
  const games = snap.docs
    .map((d) => d.data() as Game)
    .filter((g) => memberSet.has(g.userId) && g.players.some((uid) => uid !== g.userId && memberSet.has(uid)));

  const map = new Map<string, { caps: number; games: number; wins: number; losses: number }>();
  for (const g of games) {
    const existing = map.get(g.userId) ?? { caps: 0, games: 0, wins: 0, losses: 0 };
    map.set(g.userId, {
      caps: existing.caps + g.capsMade + g.bounces + (g.rebuttals ?? 0) + (g.floaters ?? 0) + (g.gameWinners ?? 0),
      games: existing.games + 1,
      wins: existing.wins + (g.result === 'win' ? 1 : 0),
      losses: existing.losses + (g.result === 'loss' ? 1 : 0),
    });
  }

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
      photoURL: user.photoURL,
      totalCaps: stats.caps,
      totalGames: stats.games,
      totalWins: stats.wins,
      totalLosses: stats.losses,
      capsPerGame: stats.games > 0 ? stats.caps / stats.games : 0,
    });
  }
  return entries.sort((a, b) => b.totalCaps - a.totalCaps);
}

export async function isUsernameTaken(username: string, excludeUid?: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'users'), where('username', '==', username)));
  return snap.docs.some((d) => d.id !== excludeUid);
}

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
  floaters: number,
  gameWinners: number,
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
    floaters,
    gameWinners,
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

export async function deleteGame(gameId: string): Promise<void> {
  await deleteDoc(doc(db, 'games', gameId));
}

export async function updateGame(
  gameId: string,
  userId: string,
  players: string[],
  capsMade: number,
  bounces: number,
  rebuttals: number,
  floaters: number,
  gameWinners: number,
  result: 'win' | 'loss',
  notes: string,
  date: number
): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    userId, players, capsMade, bounces, rebuttals, floaters, gameWinners,
    result, notes, date, approvals: [], rejections: [], status: 'pending',
  });
}

export async function approveGame(gameId: string, approverId: string) {
  const gameRef = doc(db, 'games', gameId);

  // Pre-transaction eligibility check (cheap read before paying transaction cost)
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return;
  const game = snap.data() as Game;
  if (game.status !== 'pending') return;
  if (approverId === game.userId) return;
  if (game.approvals.includes(approverId)) return;

  const capsAdded = game.capsMade + game.bounces + (game.rebuttals ?? 0) + (game.floaters ?? 0) + (game.gameWinners ?? 0);
  const userRef = doc(db, 'users', game.userId);

  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const userSnap = await tx.get(userRef);
    if (!gameSnap.exists() || !userSnap.exists()) return;

    const g = gameSnap.data() as Game;
    const u = userSnap.data() as User;

    // Re-check inside transaction to prevent double-approval race
    if (g.status !== 'pending') return;
    if (g.approvals.includes(approverId)) return;

    tx.update(gameRef, { status: 'verified', approvals: arrayUnion(approverId) });

    // Streak is computed atomically inside the transaction from the stored value:
    // win → increment, loss → reset to 0. This avoids a collection query (which
    // can't run inside a Firestore transaction) and eliminates the race condition
    // where two simultaneous approvals could both read stale streak data.
    const newStreak = game.result === 'win' ? (u.currentWinStreak ?? 0) + 1 : 0;

    if (game.result === 'win') {
      tx.update(userRef, {
        totalCaps: (u.totalCaps ?? 0) + capsAdded,
        totalGames: (u.totalGames ?? 0) + 1,
        totalWins: (u.totalWins ?? 0) + 1,
        currentWinStreak: newStreak,
        bestWinStreak: Math.max(newStreak, u.bestWinStreak ?? 0),
      });
    } else {
      tx.update(userRef, {
        totalCaps: (u.totalCaps ?? 0) + capsAdded,
        totalGames: (u.totalGames ?? 0) + 1,
        totalLosses: (u.totalLosses ?? 0) + 1,
        currentWinStreak: 0,
      });
    }
  });
}

export async function rejectGame(gameId: string, rejectorId: string): Promise<boolean> {
  const gameRef = doc(db, 'games', gameId);
  let fullyRejected = false;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) return;

    const game = snap.data() as Game;
    if (game.status !== 'pending') return;
    if (rejectorId === game.userId) return;
    if (game.rejections.includes(rejectorId)) return;

    const newRejections = [...game.rejections, rejectorId];
    const otherPlayers = game.players.filter((p) => p !== game.userId);
    const allRejected = otherPlayers.every((p) => newRejections.includes(p));

    tx.update(gameRef, {
      rejections: arrayUnion(rejectorId),
      ...(allRejected ? { status: 'rejected' } : {}),
    });

    fullyRejected = allRejected;
  });

  return fullyRejected;
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
      caps: existing.caps + g.capsMade + g.bounces + (g.rebuttals ?? 0) + (g.floaters ?? 0) + (g.gameWinners ?? 0),
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
      photoURL: user.photoURL,
      totalCaps: stats.caps,
      totalGames: stats.games,
      totalWins: stats.wins,
      totalLosses: stats.losses,
      capsPerGame: stats.games > 0 ? stats.caps / stats.games : 0,
    });
  }

  return entries.sort((a, b) => b.totalCaps - a.totalCaps);
}

export interface AchievementHolder {
  username: string;
  displayName: string;
  photoURL?: string;
  total: number;
}

export interface Achievements {
  mrRebuttal: AchievementHolder | null;
  bounceMerchant: AchievementHolder | null;
  hotStreak: AchievementHolder | null;
  sharpShooter: AchievementHolder | null;
  ironman: AchievementHolder | null;
  burger: AchievementHolder | null;
  floatMaster: AchievementHolder | null;
  closer: AchievementHolder | null;
}

type GroupStats = {
  rebuttals: number;
  bounces: number;
  floaters: number;
  gameWinners: number;
  games: number;
  wins: number;
  losses: number;
  caps: number;
  results: { date: number; result: 'win' | 'loss' }[];
};

export async function getAchievements(memberIds: string[]): Promise<Achievements> {
  const snap = await getDocs(
    query(collection(db, 'games'), where('status', '==', 'verified'))
  );

  // Only count games where the logger AND at least one opponent are both group members
  const statsMap = new Map<string, GroupStats>();

  for (const d of snap.docs) {
    const g = d.data() as Game;
    if (!memberIds.includes(g.userId)) continue;
    if (!g.players.some(uid => uid !== g.userId && memberIds.includes(uid))) continue;

    if (!statsMap.has(g.userId)) {
      statsMap.set(g.userId, { rebuttals: 0, bounces: 0, floaters: 0, gameWinners: 0, games: 0, wins: 0, losses: 0, caps: 0, results: [] });
    }
    const s = statsMap.get(g.userId)!;
    s.rebuttals += g.rebuttals ?? 0;
    s.bounces += g.bounces ?? 0;
    s.floaters += g.floaters ?? 0;
    s.gameWinners += g.gameWinners ?? 0;
    s.games += 1;
    s.wins += g.result === 'win' ? 1 : 0;
    s.losses += g.result === 'loss' ? 1 : 0;
    s.caps += (g.capsMade ?? 0) + (g.bounces ?? 0) + (g.rebuttals ?? 0) + (g.floaters ?? 0) + (g.gameWinners ?? 0);
    s.results.push({ date: g.date, result: g.result });
  }

  function currentStreak(results: GroupStats['results']): number {
    const sorted = [...results].sort((a, b) => b.date - a.date);
    let streak = 0;
    for (const r of sorted) {
      if (r.result === 'win') streak++;
      else break;
    }
    return streak;
  }

  async function topFromMap(
    pick: (s: GroupStats) => number,
    minGames = 0
  ): Promise<{ username: string; displayName: string; photoURL?: string; total: number } | null> {
    let bestUid: string | null = null;
    let bestVal = -1;
    for (const [uid, s] of statsMap.entries()) {
      if (s.games < minGames) continue;
      const val = pick(s);
      if (val > bestVal) { bestVal = val; bestUid = uid; }
    }
    if (!bestUid || bestVal <= 0) return null;
    const user = await getUser(bestUid);
    if (!user) return null;
    return { username: user.username, displayName: user.displayName, photoURL: user.photoURL, total: bestVal };
  }

  const [mrRebuttal, bounceMerchant, hotStreak, ironman, burger, sharpShooter, floatMaster, closer] = await Promise.all([
    topFromMap(s => s.rebuttals),
    topFromMap(s => s.bounces),
    topFromMap(s => currentStreak(s.results)),
    topFromMap(s => s.games),
    topFromMap(s => s.losses),
    topFromMap(s => Math.round((s.caps / s.games) * 10) / 10, 3),
    topFromMap(s => s.floaters),
    topFromMap(s => s.gameWinners),
  ]);

  return { mrRebuttal, bounceMerchant, hotStreak, sharpShooter, ironman, burger, floatMaster, closer };
}

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Failed to read image (${response.status})`);
  const blob = await response.blob();
  const storageRef = ref(storage, `profile_photos/${uid}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function updateUserPhotoURL(uid: string, photoURL: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { photoURL });
}
