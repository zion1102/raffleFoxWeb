import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Import Firestore
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDHWDBBumA8CAvkerwAGNwSRCyqTv1BTBw",
  authDomain: "rafflefox-23872.firebaseapp.com",
  projectId: "rafflefox-23872",
  storageBucket: "rafflefox-23872.appspot.com",
  messagingSenderId: "513110580475",
  appId: "1:513110580475:web:ba77e2731742a34724245e",
  measurementId: "G-69X2MGPZJY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app); // Initialize Firestore


export { auth, db }; // Export Firestore and Auth
