// components/ClientProviders.jsx
"use client";

import React from "react";
import { FirebaseProvider } from "@/components/FirebaseProvider";
import { WalletProviderComponent } from '@/components/WalletProvider';
import PriceSchedulerInitializer from '@/components/PriceSchedulerInitializer';


export default function ClientProviders({ children }) {
  return (
    <FirebaseProvider>
      <WalletProviderComponent>
      <PriceSchedulerInitializer />
        {children}
      </WalletProviderComponent>
    </FirebaseProvider>
  );
}