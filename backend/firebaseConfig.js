// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDbtw87NpBAema-2eA58hpDuS85dxCBn50",
  authDomain: "wecinema-21d00.firebaseapp.com",
  projectId: "wecinema-21d00",
  storageBucket: "wecinema-21d00.appspot.com",
  messagingSenderId: "257754899711",
  appId: "1:257754899711:web:affc6a0e53f9c9806c18ca",
  measurementId: "G-1TR2CEXH5M"
  };
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/user.birthday.read');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

export { auth, googleProvider, app, database };
