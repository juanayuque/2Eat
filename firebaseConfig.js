// firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
  getAuth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAIEdLP149Kq3_s0CmUbo-DHTZsrfN4oR4",
  authDomain: "eat-19844.firebaseapp.com",
  projectId: "eat-19844",
  storageBucket: "eat-19844.firebasestorage.app",
  messagingSenderId: "471442133206",
  appId: "1:471442133206:web:829de137a96cc23754b977",
  measurementId: "G-W6JPB8QLNX"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);