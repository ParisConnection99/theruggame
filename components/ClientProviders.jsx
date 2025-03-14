// components/ClientProviders.jsx
"use client";

import React, { useEffect } from "react";
import { FirebaseProvider } from "@/components/FirebaseProvider";
import { WalletProviderComponent } from '@/components/WalletProvider';
import { initializePriceScheduler } from '@/services/PricesSchedulerInitializer';
import { WalletProvider } from "@/components/WalletContext";

export default function ClientProviders({ children }) {
  useEffect(() => {
    // Initialize the price scheduler
    initializePriceScheduler();
  }, []);

  return (
    <FirebaseProvider>
      <WalletProviderComponent>
        <WalletProvider>
        {children}
        </WalletProvider>
      </WalletProviderComponent>
    </FirebaseProvider>
  );
}