// firebaseConfig.js (or config.ts)
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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const db = getFirestore(app); // Change from firestore to db
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('https://www.googleapis.com/auth/user.birthday.read');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

export { auth, googleProvider, app, database, db }; // Change here too