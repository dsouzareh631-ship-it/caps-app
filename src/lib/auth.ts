import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
