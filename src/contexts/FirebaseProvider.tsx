import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDocFromServer, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface FirebaseContextType {
  user: User | null;
  role: "admin" | "agent" | null;
  loading: boolean;
  remindersEnabled: boolean;
  setRemindersEnabled: (enabled: boolean) => void;
}

const FirebaseContext = createContext<FirebaseContextType>({ 
  user: null, 
  role: null, 
  loading: true,
  remindersEnabled: true,
  setRemindersEnabled: () => {}
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "agent" | null>(null);
  const [loading, setLoading] = useState(true);
  const [remindersEnabled, setRemindersEnabledState] = useState(() => {
    const saved = localStorage.getItem("remindersEnabled");
    return saved === null ? true : saved === "true";
  });

  const setRemindersEnabled = (enabled: boolean) => {
    setRemindersEnabledState(enabled);
    localStorage.setItem("remindersEnabled", String(enabled));
  };

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth instance not found. Authentication features will be disabled.");
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUser(user);
          try {
            // Fetch or create user document in Firestore
            const userRef = doc(db, "users", user.uid);
            // Use getDocFromServer to force a network attempt and fail fast if actually offline
            // vs getting stuck with a stale/offline cache message
            let userSnap;
            try {
              // Try server first to ensure fresh role info, fallback to cache if genuinely offline
              userSnap = await getDocFromServer(userRef).catch(() => getDoc(userRef));
            } catch (serverError) {
              console.warn("Firestore fetch failed, defaulting to agent role:", serverError);
              setRole("agent");
            }
 
            if (userSnap && userSnap.exists()) {
              let currentRole = userSnap.data().role;
              // Auto-promote new admin email or current owner if needed
              if ((user.email === "leadpilot25@gmail.com" || user.email === "mail.nasiya@gmail.com") && currentRole !== "admin") {
                currentRole = "admin";
                await setDoc(userRef, { role: "admin" }, { merge: true });
              }
              setRole(currentRole);
            } else {
              // Default role is agent, but make both of these emails admin
              const isAdminEmail = user.email === "leadpilot25@gmail.com" || user.email === "mail.nasiya@gmail.com";
              const initialRole = isAdminEmail ? "admin" : "agent";
              const userData = {
                uid: user.uid,
                name: user.displayName || user.email?.split("@")[0] || "User",
                email: user.email,
                role: initialRole,
                createdAt: new Date().toISOString(),
              };
              await setDoc(userRef, userData);
              setRole(initialRole);
            }
          } catch (firestoreError) {
            console.error("Error fetching user profile from Firestore:", firestoreError);
            setRole("agent"); // Fallback fallback
          }
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Auth state observer error:", error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Failed to initialize auth observer:", error);
      setLoading(false);
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, role, loading, remindersEnabled, setRemindersEnabled }}>
      {children}
    </FirebaseContext.Provider>
  );
};
