"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCW1PmwjHx2BZqYvK7hX-Em1RhbRZLCjyA",
  authDomain: "the-rug-game.firebaseapp.com",
  projectId: "the-rug-game",
  storageBucket: "the-rug-game.appspot.com",
  messagingSenderId: "371022221839",
  appId: "1:371022221839:web:46c9259dde9d740f0c497a",
  measurementId: "G-JGGEV50CRM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create Auth Context
const AuthContext = createContext();

export const FirebaseProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, auth }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom Hook to use Firebase Auth
export const useAuth = () => useContext(AuthContext);
