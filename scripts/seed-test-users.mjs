import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const testUsers = [
  { uid: 'test-user-001', displayName: 'Jake Miller',   username: 'jakemiller',  totalCaps: 42, totalGames: 8,  totalWins: 5, totalLosses: 3, currentWinStreak: 2, bestWinStreak: 3 },
  { uid: 'test-user-002', displayName: 'Chris Torres',  username: 'ctorres',     totalCaps: 67, totalGames: 12, totalWins: 7, totalLosses: 5, currentWinStreak: 0, bestWinStreak: 4 },
  { uid: 'test-user-003', displayName: 'Ryan O\'Brien', username: 'ryano',       totalCaps: 31, totalGames: 6,  totalWins: 3, totalLosses: 3, currentWinStreak: 1, bestWinStreak: 2 },
  { uid: 'test-user-004', displayName: 'Matt Chen',     username: 'mattchen',    totalCaps: 88, totalGames: 15, totalWins: 9, totalLosses: 6, currentWinStreak: 3, bestWinStreak: 5 },
];

for (const u of testUsers) {
  await setDoc(doc(db, 'users', u.uid), {
    ...u,
    email: `${u.username}@test.com`,
    createdAt: Date.now(),
    rebuttals: 0,
    bounces: 0,
  });
  console.log(`Created: ${u.displayName} (@${u.username})`);
}

console.log('\nDone! These users will now appear in the player search.');
process.exit(0);
