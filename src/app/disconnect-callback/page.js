'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';

export default function DisconnectCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleDisconnect = async () => {
      try {
        // Log current state before cleanup
        logInfo('Starting disconnect cleanup', {
          component: 'DisconnectCallbackPage',
          hasSession: !!localStorage.getItem('phantomSession'),
          hasPublicKey: !!localStorage.getItem('phantomPublicKey')
        });

        // Clean up all wallet-related data
        localStorage.removeItem('phantomPublicKey');
        localStorage.removeItem('phantomSession');
        localStorage.removeItem('wallet_connect_pending');
        localStorage.removeItem('wallet_connect_timestamp');

        // Dispatch disconnect event
        window.dispatchEvent(new Event('wallet-disconnect-event'));

        logInfo('Disconnect cleanup completed', {
          component: 'DisconnectCallbackPage'
        });

        // Delay redirect slightly to ensure cleanup is complete
        setTimeout(() => {
          router.push('/');
        }, 500);

      } catch (error) {
        logError(error, {
          component: 'DisconnectCallbackPage',
          action: 'disconnect cleanup'
        });
        
        // Still try to redirect even if there's an error
        router.push('/?error=disconnect_failed');
      }
    };

    handleDisconnect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-white">Disconnecting wallet...</p>
    </div>
  );
}
