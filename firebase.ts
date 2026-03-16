
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  sendPasswordResetEmail,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBko53TUoNJLoq4mfDSIPuDlT1rbHIUHUg",
  authDomain: "finsmart-6e61a.firebaseapp.com",
  projectId: "finsmart-6e61a",
  storageBucket: "finsmart-6e61a.firebasestorage.app",
  messagingSenderId: "249027165962",
  appId: "1:249027165962:web:dc60a98ca287b9ff59c4f3",
  measurementId: "G-1E7DLS26C9"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  sendPasswordResetEmail,
  updatePassword,
  signInWithPopup
};

export default app;
