// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDbtw87NpBAema-2eA58hpDuS85dxCBn50",
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
const firestore = getFirestore(app); // Firestore (for chat)
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Export all services
export { 
  app, 
  database, 
  firestore, 
  auth, 
  googleProvider 
};

// Export default app
export default app;