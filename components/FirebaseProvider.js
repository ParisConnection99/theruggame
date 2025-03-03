"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase Config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create Auth Context
const AuthContext = createContext();
// Add analytics context
const AnalyticsContext = createContext(null);

export const FirebaseProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        // Set up auth listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });

        // Initialize analytics
        const initAnalytics = async () => {
            try {
                const analyticsSupported = await isSupported();
                if (analyticsSupported) {
                    const analyticsInstance = getAnalytics(app);
                    setAnalytics(analyticsInstance);
                    console.log("Firebase Analytics initialized");
                }
            } catch (error) {
                console.error("Failed to initialize analytics:", error);
            }
        };

        initAnalytics();

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, auth }}>
            <AnalyticsContext.Provider value={analytics}>
                {children}
            </AnalyticsContext.Provider>
        </AuthContext.Provider>
    );
};

// Custom Hook to use Firebase Auth
export const useAuth = () => useContext(AuthContext);

// Custom Hook to use Firebase Analytics
export const useAnalytics = () => useContext(AnalyticsContext);

// Helper function to log events
export const logEvent = (eventName, eventParams = {}) => {
    const analytics = useAnalytics();
    if (analytics) {
        import("firebase/analytics").then(({ logEvent }) => {
            logEvent(analytics, eventName, eventParams);
        });
    }
};
