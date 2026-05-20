import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
