// components/ClientProviders.jsx
"use client";

import React from "react";
import { FirebaseProvider } from "@/components/FirebaseProvider";
import { WalletProviderComponent } from '@/components/WalletProvider';

export default function ClientProviders({ children }) {
  return (
    <FirebaseProvider>
      <WalletProviderComponent>
        {children}
      </WalletProviderComponent>
    </FirebaseProvider>
  );
}