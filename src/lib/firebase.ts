import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCHG6BMtqMAL4J2DA0TWGudV9SJly4k0II",
  authDomain: "financeapp-6e961.firebaseapp.com",
  projectId: "financeapp-6e961",
  storageBucket: "financeapp-6e961.firebasestorage.app",
  messagingSenderId: "106972897788",
  appId: "1:106972897788:web:3e21cde6364e3483d29279",
  measurementId: "G-6PSJQLB665"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
