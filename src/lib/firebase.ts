import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace these values with your Firebase project config from console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyBhS_yEJZbEMHDMGoSiZnyBXOF4V3fj5Rw",
  authDomain: "capsapp-bdaaa.firebaseapp.com",
  projectId: "capsapp-bdaaa",
  storageBucket: "capsapp-bdaaa.firebasestorage.app",
  messagingSenderId: "420559417486",
  appId: "1:420559417486:web:625f3533999bedf30cd9df",
  measurementId: "G-S5GQSLD338"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
