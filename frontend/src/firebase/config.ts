// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "f08306fa7ba1a4cb5d65693ab63953c1dfe4f458",
  authDomain: "wecinema-21d00.firebaseapp.com",
  databaseURL: "https://wecinema-21d00-default-rtdb.firebaseio.com",
  projectId: "wecinema-21d00",
  storageBucket: "wecinema-21d00.appspot.com",
  messagingSenderId: "257754899711",
  appId: "1:257754899711:web:affc6a0e53f9c9806c18ca",
  measurementId: "G-1TR2CEXH5M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const database = getDatabase(app); // Realtime Database
const firestore = getFirestore(app); // Firestore Database
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Add scopes for Google provider
googleProvider.addScope('https://www.googleapis.com/auth/user.birthday.read');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Export with alias
export { 
  auth, 
  googleProvider, 
  app, 
  database, // Realtime Database
  firestore, // Firestore
  firestore as db // Alias for db (common convention)
};