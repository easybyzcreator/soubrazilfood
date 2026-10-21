import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnSBCxdjMNVRmlxVPE45htMRoCmCz5j8k",
  authDomain: "app-sou-fit.firebaseapp.com",
  projectId: "app-sou-fit",
  storageBucket: "app-sou-fit.firebasestorage.app",
  messagingSenderId: "519900061126",
  appId: "1:519900061126:web:47f23c7e8da8cdc65866c7",
  measurementId: "G-47TP8MM50S"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : undefined;
