'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletProviderComponent = ({ children }) => {
  const network = 'mainnet-beta';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Configure wallets - focus exclusively on Phantom for MVP
  const wallets = useMemo(() => {
    return [
      new PhantomWalletAdapter({
        // Set explicit timeout of 30 seconds (in milliseconds)
        connecting: 30000
      })
    ];
  }, []);
  
  // Configure provider with improved options
  const walletProviderConfig = useMemo(() => ({
    wallets,
    autoConnect: false, // Important: disable autoConnect for better control
    onError: (error) => {
      console.error('Wallet connection error in provider:', error);
    }
  }), [wallets]);
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider {...walletProviderConfig}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};