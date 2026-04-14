"use client";

import React, { useEffect, useRef } from "react";
import { getUserData, onAuthStateChanged } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";

/**
 * Single global auth listener — mounted once at the app root.
 * Uses the lazy Firebase wrapper so no server-side Firebase calls happen.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setIsRefreshing, auth: storedAuth } = useAuthStore();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        // If persisted store already has this user, skip the Firestore fetch
        if (storedAuth && storedAuth.id === user.uid) {
          setIsRefreshing(false);
          return;
        }
        try {
          const userData = await getUserData(user.uid);
          setAuth({
            id: user.uid,
            email: user.email ?? "",
            username:
              userData?.username ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "Otaku",
            avatar: userData?.avatar || user.photoURL || "",
            autoSkip: userData?.autoSkip ?? false,
          });
        } catch {
          // Firebase unavailable — fall back to persisted store
        }
      } else {
        clearAuth();
      }
      setIsRefreshing(false);
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
