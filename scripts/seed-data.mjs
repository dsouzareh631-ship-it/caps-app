import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, addDoc, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBhS_yEJZbEMHDMGoSiZnyBXOF4V3fj5Rw",
  authDomain: "capsapp-bdaaa.firebaseapp.com",
  projectId: "capsapp-bdaaa",
  storageBucket: "capsapp-bdaaa.firebasestorage.app",
  messagingSenderId: "420559417486",
  appId: "1:420559417486:web:625f3533999bedf30cd9df",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const users = [
  { uid: 'test-user-001', displayName: 'Jake Miller',   username: 'jakemiller',  totalCaps: 89,  totalGames: 14, totalWins: 9,  totalLosses: 5,  currentWinStreak: 3, bestWinStreak: 5 },
  { uid: 'test-user-002', displayName: 'Chris Torres',  username: 'ctorres',     totalCaps: 112, totalGames: 18, totalWins: 11, totalLosses: 7,  currentWinStreak: 1, bestWinStreak: 4 },
  { uid: 'test-user-003', displayName: 'Ryan O\'Brien', username: 'ryano',       totalCaps: 54,  totalGames: 10, totalWins: 4,  totalLosses: 6,  currentWinStreak: 0, bestWinStreak: 3 },
  { uid: 'test-user-004', displayName: 'Matt Chen',     username: 'mattchen',    totalCaps: 143, totalGames: 22, totalWins: 14, totalLosses: 8,  currentWinStreak: 4, bestWinStreak: 7 },
];

// Seed users
for (const u of users) {
  await setDoc(doc(db, 'users', u.uid), {
    ...u,
    email: `${u.username}@test.com`,
    createdAt: Date.now(),
  });
  console.log(`User: ${u.displayName} (@${u.username})`);
}

const now = Date.now();
const day = 86400000;

// Games between test users and your real account
// We'll use a placeholder for your UID — replace if needed
const MY_UID = 'test-user-000'; // placeholder, games between test users only

const games = [
  // Matt vs Jake — Matt wins (3 weeks ago)
  { userId: 'test-user-004', players: ['test-user-004','test-user-001','test-user-002'], capsMade: 8, bounces: 2, rebuttals: 1, result: 'win',  notes: 'Great game at the house', date: now - 21*day, status: 'verified', approvals: ['test-user-001'], rejections: [] },
  // Chris vs Ryan — Chris wins (2.5 weeks ago)
  { userId: 'test-user-002', players: ['test-user-002','test-user-003','test-user-004'], capsMade: 7, bounces: 1, rebuttals: 0, result: 'win',  notes: '', date: now - 18*day, status: 'verified', approvals: ['test-user-003'], rejections: [] },
  // Ryan vs Matt — Ryan loses (2 weeks ago)
  { userId: 'test-user-003', players: ['test-user-003','test-user-004','test-user-001'], capsMade: 4, bounces: 0, rebuttals: 2, result: 'loss', notes: 'Close game', date: now - 14*day, status: 'verified', approvals: ['test-user-004'], rejections: [] },
  // Jake vs Chris — Jake wins (10 days ago)
  { userId: 'test-user-001', players: ['test-user-001','test-user-002','test-user-003'], capsMade: 9, bounces: 3, rebuttals: 0, result: 'win',  notes: 'On fire tonight', date: now - 10*day, status: 'verified', approvals: ['test-user-002'], rejections: [] },
  // Matt vs Ryan — Matt wins (1 week ago)
  { userId: 'test-user-004', players: ['test-user-004','test-user-003','test-user-001'], capsMade: 11, bounces: 1, rebuttals: 1, result: 'win', notes: '', date: now - 7*day, status: 'verified', approvals: ['test-user-003'], rejections: [] },
  // Chris vs Jake — Chris loses (5 days ago)
  { userId: 'test-user-002', players: ['test-user-002','test-user-001','test-user-004'], capsMade: 5, bounces: 0, rebuttals: 3, result: 'loss', notes: 'Rough night', date: now - 5*day, status: 'verified', approvals: ['test-user-001'], rejections: [] },
  // Matt vs Chris — Matt wins (3 days ago)
  { userId: 'test-user-004', players: ['test-user-004','test-user-002','test-user-003'], capsMade: 10, bounces: 4, rebuttals: 0, result: 'win', notes: 'Bounce merchant at it again', date: now - 3*day, status: 'verified', approvals: ['test-user-002'], rejections: [] },
  // Jake vs Matt — Jake wins (2 days ago)
  { userId: 'test-user-001', players: ['test-user-001','test-user-004','test-user-003'], capsMade: 7, bounces: 1, rebuttals: 2, result: 'win',  notes: '', date: now - 2*day, status: 'verified', approvals: ['test-user-004'], rejections: [] },
  // Ryan vs Jake — pending (yesterday)
  { userId: 'test-user-003', players: ['test-user-003','test-user-001','test-user-002'], capsMade: 6, bounces: 0, rebuttals: 1, result: 'loss', notes: 'Need verification', date: now - 1*day, status: 'pending', approvals: [], rejections: [] },
  // Chris vs Matt — pending (today)
  { userId: 'test-user-002', players: ['test-user-002','test-user-004','test-user-001'], capsMade: 8, bounces: 2, rebuttals: 0, result: 'win',  notes: 'Fresh game', date: now, status: 'pending', approvals: [], rejections: [] },
];

for (const g of games) {
  const ref = await addDoc(collection(db, 'games'), {
    ...g,
    createdAt: Date.now(),
  });
  console.log(`Game: ${g.userId} — ${g.result} (${g.status}) [${ref.id}]`);
}

console.log('\n✅ Done! Open the app to see the seeded data.');
process.exit(0);
