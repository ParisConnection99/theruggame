// components/ClientProviders.jsx
"use client";

import React from "react";
import { FirebaseProvider } from "@/components/FirebaseProvider";
import { WalletProviderComponent } from '@/components/WalletProvider';
import '@solana/wallet-adapter-react-ui/styles.css'; // Add this for wallet modal styling

export default function ClientProviders({ children }) {
  return (
    <FirebaseProvider>
      <WalletProviderComponent>
        {children}
      </WalletProviderComponent>
    </FirebaseProvider>
  );
}