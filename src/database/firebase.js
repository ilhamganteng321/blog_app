// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBOAAgDxM4YpAanDYNmJEpKbPccuJt-0hM",
  authDomain: "blog-app-18073.firebaseapp.com",
  projectId: "blog-app-18073",
  storageBucket: "blog-app-18073.firebasestorage.app",
  messagingSenderId: "8583834783",
  appId: "1:8583834783:web:204ac4ca2df0a815d206aa",
  measurementId: "G-N20EMDRYZT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;