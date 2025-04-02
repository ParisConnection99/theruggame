'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

export const WalletProviderComponent = ({ children }) => {
    // Set up network
    const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);

    // Initialize Phantom adapter with required config
    const phantomWallet = useMemo(() => {
        const wallet = new PhantomWalletAdapter();
        return wallet;
    }, []);
  
    // Create wallets array with the phantom wallet
    const wallets = useMemo(() => [phantomWallet], [phantomWallet]);
  
    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={true}>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  };

export default WalletProviderComponent; 