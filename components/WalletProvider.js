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
  
  // Configure wallets - only Phantom for MVP
  const wallets = useMemo(() => {
    return [new PhantomWalletAdapter()];
  }, []);
  
  // Configure wallet provider options with simplified settings
  const walletProviderConfig = useMemo(() => ({
    wallets,
    autoConnect: false, // Changed to false to allow manual connection control
    onError: (error) => {
      console.error('Wallet connection error:', error);
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