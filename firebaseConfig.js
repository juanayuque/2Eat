// firebaseConfig.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  setPersistence,
  indexedDBLocalPersistence, // web
  browserLocalPersistence,   // web fallback
  Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyAIEdLP149Kq3_s0CmUbo-DHTZsrfN4oR4",
  authDomain: "eat-19844.firebaseapp.com",
  projectId: "eat-19844",
  storageBucket: "eat-19844.firebasestorage.app",
  messagingSenderId: "471442133206",
  appId: "1:471442133206:web:829de137a96cc23754b977",
  measurementId: "G-W6JPB8QLNX"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Create exactly ONE Auth instance, with proper persistence per platform
let _auth: Auth;

if (Platform.OS === "web") {
  // Web: use standard web persistence
  _auth = getAuth(app);
  // pick IndexedDB, fallback to localStorage
  setPersistence(_auth, indexedDBLocalPersistence).catch(() =>
    setPersistence(_auth, browserLocalPersistence)
  );
} else {
  // React Native: use AsyncStorage persistence (this removes your warning)
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const auth = _auth;