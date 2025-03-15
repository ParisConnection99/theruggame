'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
import { logInfo, logError } from '@/utils/logger';

export const WalletProviderComponent = ({ children }) => {
  const network = 'mainnet-beta';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [isClient, setIsClient] = useState(false);

  // We need to use useState for wallets because we want to detect
  // if we're on mobile or desktop after component mounts
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    setIsClient(true);

    // Initialize PhantomWalletAdapter
    const phantomAdapter = new PhantomWalletAdapter();
    const walletAdapters = [phantomAdapter];
    setWallets(walletAdapters);

    // // Restore connection if wallet was previously connected
    // const storedPublicKey = localStorage.getItem('wallet_public_key');
    // if (storedPublicKey) {
    //     console.log('Restoring wallet connection for:', storedPublicKey);
    //     logInfo('Restoring wallet connection for:', {
    //         component: "Wallet Provider",
    //         storedPublicKey: storedPublicKey
    //     });

    //     setTimeout(() => {
    //         phantomAdapter.connect().catch((err) => console.error('Auto-reconnect failed:', err));
    //     }, 500); // Delay ensures provider is ready
    // }

    // Mobile-specific logic
    const isMobileDevice = () => {
        if (typeof navigator === 'undefined') return false;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    if (isMobileDevice()) {
        // Handle wallet connection start
        logInfo('Is Mobile device', {
            component: 'Wallet Provider'
        });
        const handleWalletConnectionStart = () => {
            localStorage.setItem('wallet_connect_pending', 'true');
            localStorage.setItem('wallet_connect_timestamp', Date.now().toString());

            // Save the current wallet public key
            const storedPublicKey = phantomAdapter.publicKey?.toBase58();
            if (storedPublicKey) {
                localStorage.setItem('wallet_public_key', storedPublicKey);
            }
        };

        window.addEventListener('wallet-connect-start', handleWalletConnectionStart);

        // Check if returning from wallet connection
        const checkWalletReturn = () => {
            const pendingConnection = localStorage.getItem('wallet_return_reconnect');
            if (pendingConnection === 'true') {
                console.log('Detected return from wallet connection');
                logInfo('Detected return from wallet connection', {
                    component: 'Wallet Provider'
                });

                // Get wallet data
                const publicKey = localStorage.getItem('phantomPublicKey');
                const session = localStorage.getItem('phantomSession');

                if (publicKey && session) {
                    // Dispatch event with available data
                    const walletEvent = new CustomEvent('wallet-callback-event', {
                        detail: { publicKey, session }
                    });

                    // Short delay to ensure component is mounted
                    setTimeout(() => {
                        window.dispatchEvent(walletEvent);
                    }, 1000);
                }
            }
        };

        checkWalletReturn();

        // Handle visibility changes for mobile
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log("Visibility changed - returning from wallet app");

                // If we've just become visible, check if we need to reconnect
                const pendingConnection = localStorage.getItem('wallet_connect_pending');
                if (pendingConnection === 'true') {
                    // Short delay to let UI stabilize
                    setTimeout(() => {
                        window.dispatchEvent(new Event('wallet-return-reconnect'));
                    }, 500);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
}, []);

  // Handle rendering nothing on the server
  if (!isClient) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

  // useEffect(() => {
  //   setIsClient(true);

  //   // // Following the tutorial approach - simple setup with just PhantomWalletAdapter
  //   // const phantomAdapter = new PhantomWalletAdapter();
  //   // const walletAdapters = [phantomAdapter];
  //   // setWallets(walletAdapters);

  //   // // Restore connection if wallet was previously connected
  //   // const storedPublicKey = localStorage.getItem('wallet_public_key');
  //   // if (storedPublicKey) {
  //   //   console.log('Restoring wallet connection for:', storedPublicKey);
      
  //   //   logInfo('Restoring wallet connection for:', {
  //   //       component: "Wallet Provider",
  //   //       storedPublicKey: storedPublicKey
  //   //   });

  //   //   setTimeout(() => {
  //   //     phantomAdapter.connect().catch((err) => console.error('Auto-reconnect failed:', err));
  //   //   }, 500); // Delay ensures provider is ready
  //   // }

  //   // For mobile devices, we'll still handle wallet returns
  //   const isMobileDevice = () => {
  //     if (typeof navigator === 'undefined') return false;
  //     return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  //   };

  //   if (isMobileDevice()) {
  //     // Handle wallet connection start
  //     logInfo('Is Mobile device', {
  //       component: 'Wallet Provider'
  //     });
  //     const handleWalletConnectionStart = () => {
  //       localStorage.setItem('wallet_connect_pending', 'true');
  //       localStorage.setItem('wallet_connect_timestamp', Date.now().toString());

  //       // Save the current wallet public key
  //       const storedPublicKey = phantomAdapter.publicKey?.toBase58();
  //       if (storedPublicKey) {
  //         localStorage.setItem('wallet_public_key', storedPublicKey);
  //       }
  //     };

  //     window.addEventListener('wallet-connect-start', handleWalletConnectionStart);

  //     // Check if returning from wallet connection
  //     const checkWalletReturn = () => {
  //       const pendingConnection = localStorage.getItem('wallet_return_reconnect');
  //       if (pendingConnection === 'true') {
  //         console.log('Detected return from wallet connection');
  //         logInfo('Detected return from wallet connection', {
  //           component: 'Wallet Provider'
  //         });
          
  //         // Get wallet data
  //         const publicKey = localStorage.getItem('phantomPublicKey');
  //         const session = localStorage.getItem('phantomSession');
          
  //         if (publicKey && session) {
  //           // Dispatch event with available data
  //           const walletEvent = new CustomEvent('wallet-callback-event', {
  //             detail: { publicKey, session }
  //           });
            
  //           // Short delay to ensure component is mounted
  //           setTimeout(() => {
  //             window.dispatchEvent(walletEvent);
  //           }, 1000);
  //         }
  //       }
  //     };
  //     // const checkWalletReturn = () => {
  //     //   const pendingConnection = localStorage.getItem('wallet_connect_pending');
  //     //   if (pendingConnection === 'true') {
  //     //     // Clear the pending flag
  //     //     localStorage.removeItem('wallet_connect_pending');

  //     //     // Check if we're within a reasonable timeframe (5 minutes)
  //     //     const timestamp = parseInt(localStorage.getItem('wallet_connect_timestamp') || '0');
  //     //     const now = Date.now();
  //     //     const fiveMinutes = 5 * 60 * 1000;

  //     //     if (now - timestamp < fiveMinutes) {
  //     //       console.log('Detected return from wallet connection');
  //     //       // We'll attempt a reconnection
  //     //       setTimeout(() => {
  //     //         console.log('Attempting to reconnect wallet after return');
  //     //         window.dispatchEvent(new Event('wallet-return-reconnect'));
  //     //       }, 1000); // Short delay to let things initialize
  //     //     } else {
  //     //       // Session probably expired
  //     //       localStorage.removeItem('wallet_connect_timestamp');
  //     //     }
  //     //   }
  //     // };

  //     checkWalletReturn();

  //     // Handle visibility changes for mobile
  //     const handleVisibilityChange = () => {
  //       if (!document.hidden) {
  //         console.log("Visibility changed - returning from wallet app");

  //         // If we've just become visible, check if we need to reconnect
  //         const pendingConnection = localStorage.getItem('wallet_connect_pending');
  //         if (pendingConnection === 'true') {
  //           // Short delay to let UI stabilize
  //           setTimeout(() => {
  //             window.dispatchEvent(new Event('wallet-return-reconnect'));
  //           }, 500);
  //         }
  //       }
  //     };

  //     document.addEventListener('visibilitychange', handleVisibilityChange);
  //     return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   }
  // }, []);