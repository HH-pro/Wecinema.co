import { initializeApp } from "firebase/app";
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

const appp = initializeApp(firebaseConfig);
const auth = getAuth(appp);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, appp};