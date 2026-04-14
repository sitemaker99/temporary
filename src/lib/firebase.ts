/**
 * firebase.ts — fully lazy, browser-only Firebase initialisation.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as _onAuthStateChanged,
  type Auth,
  type User,
  type NextOrObserver,
  type Unsubscribe,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ── App singleton (safe on server — pure config) ──────────────────────────────
function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

// ── Lazy browser-only singletons ──────────────────────────────────────────────
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getAuthInstance(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is only available in the browser.");
  }
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

/**
 * getDbInstance() — returns the real Firestore instance.
 * Use this anywhere you need to pass `db` to collection(), doc() etc.
 * Import it alongside your firestore helpers:
 *   import { getDbInstance } from "@/lib/firebase"
 *   collection(getDbInstance(), "bookmarks")
 */
export function getDbInstance(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore is only available in the browser.");
  }
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

// ── Analytics ─────────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) getAnalytics(getApp());
  });
}

// ── Google provider ───────────────────────────────────────────────────────────
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ── onAuthStateChanged wrapper ────────────────────────────────────────────────
export function onAuthStateChanged(observer: NextOrObserver<User>): Unsubscribe {
  if (typeof window === "undefined") return () => {};
  return _onAuthStateChanged(getAuthInstance(), observer);
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getAuthInstance(), email, password);
}

export async function signupWithEmail(
  email: string,
  password: string,
  username: string
) {
  const result = await createUserWithEmailAndPassword(
    getAuthInstance(),
    email,
    password
  );
  await updateProfile(result.user, { displayName: username });
  await setDoc(doc(getDbInstance(), "users", result.user.uid), {
    uid: result.user.uid,
    email,
    username,
    avatar: "",
    autoSkip: false,
    createdAt: new Date().toISOString(),
  });
  return result;
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(getAuthInstance(), googleProvider);
  const userRef = doc(getDbInstance(), "users", result.user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: result.user.uid,
      email: result.user.email,
      username:
        result.user.displayName ||
        result.user.email?.split("@")[0] ||
        "Otaku",
      avatar: result.user.photoURL || "",
      autoSkip: false,
      createdAt: new Date().toISOString(),
    });
  }
  return result;
}

export async function logout() {
  return signOut(getAuthInstance());
}

export async function getUserData(uid: string) {
  const snap = await getDoc(doc(getDbInstance(), "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserData(
  uid: string,
  data: Record<string, unknown>
) {
  return updateDoc(doc(getDbInstance(), "users", uid), data);
}

export { type User };

// ── Storage ───────────────────────────────────────────────────────────────────
export { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
