'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';

export default function DisconnectCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      logInfo('Starting disconnect process', {
        component: 'DisconnectCallbackPage',
        action: 'disconnecting wallet'
      });

      // Check if we have any stored data to clear
      const sessionData = localStorage.getItem('phantomSession');
      const publicKey = localStorage.getItem('phantomPublicKey');

      logInfo('Current stored data for disconnect', {
        component: 'DisconnectCallbackPage',
        hasSession: !!sessionData,
        hasPublicKey: !!publicKey
      });

      // Clear all wallet-related storage
      localStorage.removeItem('phantomPublicKey');
      localStorage.removeItem('phantomSession');
      localStorage.removeItem('wallet_connect_pending');
      localStorage.removeItem('wallet_connect_timestamp');

      // Dispatch disconnect event
      window.dispatchEvent(new Event('wallet-disconnect-event'));

      logInfo('Disconnect process completed', {
        component: 'DisconnectCallbackPage',
        action: 'disconnect complete'
      });

      // Delay redirect to ensure event is processed
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (error) {
      logError(error, {
        component: 'DisconnectCallbackPage',
        action: 'disconnect process'
      });
      
      // Even if there's an error, try to clear storage and redirect
      try {
        localStorage.removeItem('phantomPublicKey');
        localStorage.removeItem('phantomSession');
        localStorage.removeItem('wallet_connect_pending');
        localStorage.removeItem('wallet_connect_timestamp');
      } catch (storageError) {
        logError(storageError, {
          component: 'DisconnectCallbackPage',
          action: 'clearing storage during error'
        });
      }

      // Redirect with error
      setTimeout(() => {
        router.push('/?error=disconnect_failed');
      }, 500);
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-blue-900">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Disconnecting Wallet</h1>
        <p>Please wait while we complete the disconnection...</p>
      </div>
    </div>
  );
}
