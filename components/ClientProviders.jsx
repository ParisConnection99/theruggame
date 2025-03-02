// components/ClientProviders.jsx
'use client';

import React from 'react';
import { FirebaseProvider } from '@/context/firebase'; // Adjust import path as needed
import WalletProviderComponent from '@/components/WalletProviderComponent'; // Adjust import path as needed
import PriceSchedulerInitializer from './PriceSchedulerInitializer';

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