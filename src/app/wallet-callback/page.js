'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';


export default function WalletCallbackPage() {
  const router = useRouter();
  
  useEffect(() => {
    try {
      // Parse query parameters from the URL
      const queryParams = new URLSearchParams(window.location.search);
      const publicKey = queryParams.get('publicKey');
      const session = queryParams.get('session');
      const signature = queryParams.get('signature');
      
      if (publicKey && session && signature) {
        // Store the connection details in localStorage
        localStorage.setItem('phantomPublicKey', publicKey);
        localStorage.setItem('phantomSession', session);
        localStorage.setItem('phantomSignature', signature);
        localStorage.setItem('wallet_return_reconnect', 'true');
        localStorage.setItem('wallet_return_timestamp', Date.now().toString());

        logInfo('Connection details', {
          component: 'WalletCallbackPage',
          publicKey: publicKey,
          session: session,
          signature: signature
        });
        
        // Dispatch custom event with wallet data before redirecting
        const walletEvent = new CustomEvent('wallet-callback-event', {
          detail: {
            publicKey,
            session,
            signature
          }
        });
        
        console.log('Dispatching wallet-callback-event with public key:', publicKey);

        logInfo('Dispatching wallet callback-event', { 
          component: 'WalletCallBackPage', 
          publicKey: publicKey
        });

        window.dispatchEvent(walletEvent);
        
        // Short delay to ensure event is processed before redirecting
        setTimeout(() => {
          // Redirect the user to the main app page
          router.push('/');
        }, 100);
      } else {
        // If any of the required parameters are missing, create an error and log it
        const missingParamsError = new Error('Missing required connection details');
        logError(missingParamsError, { 
          component: 'WalletCallBackPage', 
          action: 'validating parameters',
          params: {
            hasPublicKey: !!publicKey,
            hasSession: !!session,
            hasSignature: !!signature
          }
        });
        console.error('Missing required connection details.');
        router.push('/');
      }
    } catch (error) {
      // Catch any other errors that might occur
      logError(error, { 
        component: 'WalletCallBackPage', 
        action: 'processing wallet callback' 
      });
      router.push('/');
    }
  }, [router]);
  
  return (
    <div className="flex items-center justify-center h-screen bg-blue-900">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Connecting Wallet</h1>
        <p>Please wait while we complete your connection...</p>
      </div>
    </div>
  );
}