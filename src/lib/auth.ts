import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function signUp(email: string, password: string, displayName: string, username: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    displayName,
    username,
    email,
    createdAt: Date.now(),
    totalCaps: 0,
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    groupIds: [],
  });
  return credential.user;
}

export async function logIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function logOut() {
  await signOut(auth);
}

export async function deleteAccount(userId: string): Promise<void> {
  // Remove user from all their groups (delete group if they were the last member)
  const userSnap = await getDoc(doc(db, 'users', userId));
  const groupIds: string[] = userSnap.exists() ? (userSnap.data().groupIds ?? []) : [];

  await Promise.all(
    groupIds.map(async (groupId) => {
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      if (!groupSnap.exists()) return;
      const members: string[] = groupSnap.data().members ?? [];
      const remaining = members.filter((m) => m !== userId);
      if (remaining.length === 0) {
        await deleteDoc(doc(db, 'groups', groupId));
      } else {
        await updateDoc(doc(db, 'groups', groupId), { members: arrayRemove(userId) });
      }
    })
  );

  // Delete Firestore user document
  await deleteDoc(doc(db, 'users', userId));

  // Delete Firebase Auth account (must be last — loses auth context after this)
  const user = auth.currentUser;
  if (user) await deleteUser(user);
}
