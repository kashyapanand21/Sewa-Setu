import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔵 firebase.js is loading...");

const firebaseConfig = {
  apiKey: "AIzaSyDCrA4oDRB-Lw1Xo9t6qzzSo_mKrFuYnOg",
  authDomain: "sewa-setu-14537.firebaseapp.com",
  projectId: "sewa-setu-14537",
  storageBucket: "sewa-setu-14537.firebasestorage.app",
  messagingSenderId: "719366428138",
  appId: "1:719366428138:web:c8d88e1caa091a50b2ce93"
};

console.log("🔵 Initializing Firebase app...");
const app = initializeApp(firebaseConfig);

console.log("🔵 Getting Firebase services...");
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

console.log("🔵 Exposing Firebase to window object...");

// Expose to window for global access
window.firebaseApp = app;
window.auth = auth;
window.provider = provider;
window.db = db;
window.firestoreDB = db; // Add this for compatibility
window.currentUser = null;

// Also export for module imports
export { 
  app, 
  auth, 
  provider, 
  db,
  signInWithPopup,
  onAuthStateChanged,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  getDoc
};

// Track current user
onAuthStateChanged(auth, (user) => {
  window.currentUser = user;
  if (user) {
    console.log("✅ User authenticated:", user.email);
  } else {
    console.log("❌ No user authenticated");
  }
});

console.log("✅ Firebase initialized successfully!");
console.log("✅ window.auth =", window.auth);
console.log("✅ window.db =", window.db);