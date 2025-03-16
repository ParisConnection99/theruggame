// components/ClientProviders.jsx
"use client";

import React, { useEffect } from "react";
import { FirebaseProvider } from "@/components/FirebaseProvider";
import { initializePriceScheduler } from '@/services/PricesSchedulerInitializer'; 

export default function ClientProviders({ children }) {
  useEffect(() => {
    // Initialize the price scheduler
    initializePriceScheduler();
  }, []);

  return (
    <FirebaseProvider>
        {children}
    </FirebaseProvider>
  );
}