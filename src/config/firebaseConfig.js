import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions'; // ✅ Import Functions

const firebaseConfig = {
  apiKey: "AIzaSyDHWDBBumA8CAvkerwAGNwSRCyqTv1BTBw",
  authDomain: "rafflefox-23872.firebaseapp.com",
  projectId: "rafflefox-23872",
  storageBucket: "rafflefox-23872.appspot.com",
  messagingSenderId: "513110580475",
  appId: "1:513110580475:web:ba77e2731742a34724245e",
  measurementId: "G-69X2MGPZJY"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app); // ✅ Initialize Functions

// Export for use in app
export { auth, db, functions };
