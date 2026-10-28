/**
 * Firebase App, Cloud Firestore & Authentication Initialization
 * Proyek: smart-grocery-tracker-eeedd
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider 
} from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';

export const firebaseConfig = {
  apiKey: "AIzaSyCWAryAV6nockYYAAHCIJl4HVQVQFz_OsU",
  authDomain: "smart-grocery-tracker-eeedd.firebaseapp.com",
  projectId: "smart-grocery-tracker-eeedd",
  storageBucket: "smart-grocery-tracker-eeedd.firebasestorage.app",
  messagingSenderId: "524422583405",
  appId: "1:524422583405:web:6bf86c663133dc6f391b64",
  measurementId: "G-LZ3R3ZCBVK"
};

let app = null;
let db = null;
let auth = null;
let googleProvider = null;
let initError = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  initError = error;
  console.warn('Firebase initialization warning:', error);
}

export { 
  app, 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut, 
  onAuthStateChanged, 
  initError 
};

