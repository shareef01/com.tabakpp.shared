// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * TABAK++ Firebase Configuration
 * Restored to hardcoded keys for immediate portfolio availability.
 */
const firebaseConfig = {
  apiKey: "AIzaSyANrIBu6W6X3n-QgOfDHNZnDpa4o-EWIp8",
  authDomain: "tabakpp-ff036.firebaseapp.com",
  projectId: "tabakpp-ff036",
  storageBucket: "tabakpp-ff036.firebasestorage.app",
  messagingSenderId: "651175477527",
  appId: "1:651175477527:web:f68c3ef517667e3e9b3752"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
