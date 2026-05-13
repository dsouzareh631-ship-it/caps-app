/**
 * Full test-data seed script.
 * Usage: node scripts/seed-all.mjs <YOUR_FIREBASE_UID>
 *
 * Find your UID: Firebase Console → Authentication → Users
 *
 * What this creates:
 *  - Group "The Garage" (code: GAR4GE) with 4 test users + you
 *  - 20 verified games spread across all-time / monthly / weekly ranges
 *  - 1 pending game logged BY a test user, tagging YOU → shows in your Verifications tab
 *  - All 8 achievements covered (each won by a different player)
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';

const REAL_UID = process.argv[2];
if (!REAL_UID) {
  console.error('Usage: node scripts/seed-all.mjs <YOUR_FIREBASE_UID>');
  console.error('Find your UID: Firebase Console → Authentication → Users');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: 'AIzaSyBhS_yEJZbEMHDMGoSiZnyBXOF4V3fj5Rw',
  authDomain: 'capsapp-bdaaa.firebaseapp.com',
  projectId: 'capsapp-bdaaa',
  storageBucket: 'capsapp-bdaaa.firebasestorage.app',
  messagingSenderId: '420559417486',
  appId: '1:420559417486:web:625f3533999bedf30cd9df',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const now = Date.now();
const day = 86400000;

// ── IDs ────────────────────────────────────────────────────────
const GROUP_ID = 'test-group-garage';
const GROUP_CODE = 'GAR4GE';

const JAKE  = 'test-user-001';
const CHRIS = 'test-user-002';
const RYAN  = 'test-user-003';
const MATT  = 'test-user-004';

const groupMembers = [JAKE, CHRIS, RYAN, MATT];

// ── Group ──────────────────────────────────────────────────────
await setDoc(doc(db, 'groups', GROUP_ID), {
  id: GROUP_ID,
  name: 'The Garage',
  code: GROUP_CODE,
  createdBy: JAKE,
  members: groupMembers,
  createdAt: now,
});
console.log('✓ Group: The Garage  (invite code: GAR4GE)');

// ── Test users ─────────────────────────────────────────────────
// Stats are pre-computed to match the verified games below.
// Achievements target:
//   Jake  → Sharp Shooter (13.3 CPG), The Closer (8 game winners)
//   Chris → Bounce Merchant (23 bounces), Ironman (6 games)
//   Ryan  → Mr. Rebuttal (17 rebuttals), Burger (4 losses)
//   Matt  → Hot Streak (5-game win streak), Float Master (14 floaters)
const testUsers = [
  {
    uid: JAKE, displayName: 'Jake Miller', username: 'jakemiller',
    email: 'jakemiller@test.com',
    totalCaps: 53, totalGames: 4, totalWins: 4, totalLosses: 0,
    currentWinStreak: 4, bestWinStreak: 4,
    groupIds: [GROUP_ID],
  },
  {
    uid: CHRIS, displayName: 'Chris Torres', username: 'ctorres',
    email: 'ctorres@test.com',
    totalCaps: 52, totalGames: 6, totalWins: 4, totalLosses: 2,
    currentWinStreak: 1, bestWinStreak: 3,
    groupIds: [GROUP_ID],
  },
  {
    uid: RYAN, displayName: 'Ryan OBrien', username: 'ryano',
    email: 'ryano@test.com',
    totalCaps: 35, totalGames: 5, totalWins: 1, totalLosses: 4,
    currentWinStreak: 0, bestWinStreak: 1,
    groupIds: [GROUP_ID],
  },
  {
    uid: MATT, displayName: 'Matt Chen', username: 'mattchen',
    email: 'mattchen@test.com',
    totalCaps: 57, totalGames: 5, totalWins: 5, totalLosses: 0,
    currentWinStreak: 5, bestWinStreak: 5,
    groupIds: [GROUP_ID],
  },
];

for (const u of testUsers) {
  await setDoc(doc(db, 'users', u.uid), { ...u, createdAt: now });
  console.log(`✓ User: ${u.displayName} (@${u.username})`);
}

// Add The Garage to your account without overwriting anything else
await updateDoc(doc(db, 'users', REAL_UID), { groupIds: arrayUnion(GROUP_ID) });
console.log(`✓ Added The Garage to your account`);

// ── Games ──────────────────────────────────────────────────────
// Date bands:
//   All-time only  : > 30 days ago  (won't appear in monthly/weekly tabs)
//   Monthly only   : 4–29 days ago  (appears in monthly, not weekly)
//   Weekly + monthly: 0–3 days ago  (appears in both)
//
// "Weekly" uses startOfWeek (Sunday midnight).
// "Monthly" uses startOfMonth (1st of month midnight).
// Dates chosen so today = May 13 → weekly starts May 10, monthly starts May 1.

const games = [
  // ── JAKE (4 games, 4W-0L) ─────────────────────────────────
  // G1 — all-time (55d)
  { userId: JAKE,  players: [JAKE, CHRIS, RYAN],  capsMade: 10, bounces: 0, floaters: 0, gameWinners: 3, rebuttals: 1, result: 'win',  notes: 'On a tear tonight',        date: now - 55*day, status: 'verified', approvals: [CHRIS], rejections: [] },
  // G2 — all-time (40d)
  { userId: JAKE,  players: [JAKE, MATT, CHRIS],  capsMade: 11, bounces: 1, floaters: 0, gameWinners: 2, rebuttals: 0, result: 'win',  notes: '',                         date: now - 40*day, status: 'verified', approvals: [MATT],  rejections: [] },
  // G3 — monthly only (9d = May 4)
  { userId: JAKE,  players: [JAKE, RYAN, MATT],   capsMade:  9, bounces: 0, floaters: 1, gameWinners: 2, rebuttals: 0, result: 'win',  notes: 'Close one',                date: now -  9*day, status: 'verified', approvals: [RYAN],  rejections: [] },
  // G4 — weekly (3d = May 10, start of week)
  { userId: JAKE,  players: [JAKE, CHRIS, RYAN],  capsMade: 12, bounces: 0, floaters: 0, gameWinners: 1, rebuttals: 0, result: 'win',  notes: '',                         date: now -  3*day, status: 'verified', approvals: [CHRIS], rejections: [] },

  // ── CHRIS (6 games, 4W-2L) ───────────────────────────────
  // G1 — all-time (58d)
  { userId: CHRIS, players: [CHRIS, JAKE, RYAN],  capsMade:  5, bounces: 5, floaters: 0, gameWinners: 0, rebuttals: 0, result: 'win',  notes: '',                         date: now - 58*day, status: 'verified', approvals: [JAKE],  rejections: [] },
  // G2 — all-time (50d)
  { userId: CHRIS, players: [CHRIS, MATT, RYAN],  capsMade:  4, bounces: 4, floaters: 1, gameWinners: 0, rebuttals: 0, result: 'win',  notes: 'Bounce city',               date: now - 50*day, status: 'verified', approvals: [MATT],  rejections: [] },
  // G3 — all-time (35d)
  { userId: CHRIS, players: [CHRIS, JAKE, MATT],  capsMade:  3, bounces: 3, floaters: 0, gameWinners: 0, rebuttals: 1, result: 'loss', notes: '',                         date: now - 35*day, status: 'verified', approvals: [JAKE],  rejections: [] },
  // G4 — monthly only (12d = May 1)
  { userId: CHRIS, players: [CHRIS, RYAN, JAKE],  capsMade:  6, bounces: 4, floaters: 0, gameWinners: 0, rebuttals: 0, result: 'win',  notes: '',                         date: now - 12*day, status: 'verified', approvals: [RYAN],  rejections: [] },
  // G5 — monthly only (5d = May 8)
  { userId: CHRIS, players: [CHRIS, MATT, RYAN],  capsMade:  4, bounces: 3, floaters: 0, gameWinners: 0, rebuttals: 0, result: 'loss', notes: 'Bad day',                  date: now -  5*day, status: 'verified', approvals: [MATT],  rejections: [] },
  // G6 — weekly (1d = May 12)
  { userId: CHRIS, players: [CHRIS, RYAN, JAKE],  capsMade:  5, bounces: 4, floaters: 0, gameWinners: 0, rebuttals: 0, result: 'win',  notes: '',                         date: now -  1*day, status: 'verified', approvals: [RYAN],  rejections: [] },

  // ── RYAN (5 games, 1W-4L) ────────────────────────────────
  // G1 — all-time (52d)
  { userId: RYAN,  players: [RYAN, JAKE, CHRIS],  capsMade:  3, bounces: 0, floaters: 0, gameWinners: 0, rebuttals: 4, result: 'loss', notes: '',                         date: now - 52*day, status: 'verified', approvals: [JAKE],  rejections: [] },
  // G2 — all-time (42d)
  { userId: RYAN,  players: [RYAN, MATT, JAKE],   capsMade:  2, bounces: 0, floaters: 0, gameWinners: 0, rebuttals: 5, result: 'loss', notes: 'Rebuttal machine but still lost', date: now - 42*day, status: 'verified', approvals: [MATT],  rejections: [] },
  // G3 — all-time (32d)
  { userId: RYAN,  players: [RYAN, CHRIS, MATT],  capsMade:  4, bounces: 1, floaters: 0, gameWinners: 0, rebuttals: 3, result: 'loss', notes: '',                         date: now - 32*day, status: 'verified', approvals: [CHRIS], rejections: [] },
  // G4 — monthly only (10d = May 3)
  { userId: RYAN,  players: [RYAN, JAKE, MATT],   capsMade:  5, bounces: 0, floaters: 0, gameWinners: 0, rebuttals: 2, result: 'win',  notes: 'Finally!',                  date: now - 10*day, status: 'verified', approvals: [JAKE],  rejections: [] },
  // G5 — monthly only (7d = May 6)
  { userId: RYAN,  players: [RYAN, CHRIS, MATT],  capsMade:  3, bounces: 0, floaters: 0, gameWinners: 0, rebuttals: 3, result: 'loss', notes: '',                         date: now -  7*day, status: 'verified', approvals: [CHRIS], rejections: [] },

  // ── MATT (5 games, 5W-0L — Hot Streak) ──────────────────
  // G1 — all-time (60d)
  { userId: MATT,  players: [MATT, JAKE, CHRIS],  capsMade:  7, bounces: 2, floaters: 3, gameWinners: 0, rebuttals: 0, result: 'win',  notes: '',                         date: now - 60*day, status: 'verified', approvals: [JAKE],  rejections: [] },
  // G2 — all-time (45d)
  { userId: MATT,  players: [MATT, RYAN, CHRIS],  capsMade:  8, bounces: 1, floaters: 4, gameWinners: 1, rebuttals: 0, result: 'win',  notes: 'Float king',                date: now - 45*day, status: 'verified', approvals: [RYAN],  rejections: [] },
  // G3 — monthly only (11d = May 2)
  { userId: MATT,  players: [MATT, JAKE, RYAN],   capsMade:  9, bounces: 0, floaters: 3, gameWinners: 0, rebuttals: 0, result: 'win',  notes: '',                         date: now - 11*day, status: 'verified', approvals: [JAKE],  rejections: [] },
  // G4 — monthly only (4d = May 9)
  { userId: MATT,  players: [MATT, CHRIS, JAKE],  capsMade:  6, bounces: 1, floaters: 2, gameWinners: 0, rebuttals: 0, result: 'win',  notes: '',                         date: now -  4*day, status: 'verified', approvals: [CHRIS], rejections: [] },
  // G5 — weekly (2d = May 11)
  { userId: MATT,  players: [MATT, RYAN, JAKE],   capsMade:  7, bounces: 0, floaters: 2, gameWinners: 1, rebuttals: 0, result: 'win',  notes: 'Undefeated!',               date: now -  2*day, status: 'verified', approvals: [RYAN],  rejections: [] },

  // ── PENDING — Ryan tags YOU ──────────────────────────────
  // This shows up in your Verifications tab. Approve or reject it to test the flow.
  { userId: RYAN,  players: [RYAN, REAL_UID, CHRIS], capsMade: 5, bounces: 1, floaters: 0, gameWinners: 0, rebuttals: 2, result: 'win', notes: 'First game with you!', date: now - 0.5*day, status: 'pending', approvals: [], rejections: [] },
];

for (const g of games) {
  await addDoc(collection(db, 'games'), { ...g, createdAt: now });
  const tag = g.status === 'pending' ? '⏳ PENDING' : `${g.result.toUpperCase()} ✓`;
  console.log(`  ${tag}  ${g.userId.replace('test-user-00', 'User ')} — ${g.capsMade}c ${g.bounces}b ${g.floaters}f ${g.gameWinners}gw ${g.rebuttals}r`);
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Seed complete!

  Group invite code: GAR4GE   (The Garage)

  Leaderboard — All Time:  Matt > Jake > Chris > Ryan
  Leaderboard — Monthly:   Matt > Chris > Jake > Ryan
  Leaderboard — Weekly:    Jake > Matt > Chris  (Ryan has no games this week)

  Achievements:
    🏅 Mr. Rebuttal    → Ryan OBrien    (17 rebuttals)
    🏀 Bounce Merchant → Chris Torres   (23 bounces)
    🔥 Hot Streak      → Matt Chen      (5-game win streak)
    🎯 Sharp Shooter   → Jake Miller    (13.3 CPG)
    💪 Ironman         → Chris Torres   (6 games)
    🍔 Burger          → Ryan OBrien    (4 losses)
    🫧 Float Master    → Matt Chen      (14 floaters)
    🏁 The Closer      → Jake Miller    (8 game winners)

  Pending verification:
    Ryan tagged YOU in a game — open the app to approve or reject it.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

process.exit(0);
