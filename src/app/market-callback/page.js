'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { errorLog } from '@/utils/ErrorLog';
import { logInfo, logError } from '@/utils/logger';


function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {

    async function processCallback() {
      const marketId = localStorage.getItem('pending_transaction_market_id');
      const key = localStorage.getItem('key_id');
      const id = localStorage.getItem('bp_id');

      try {
        // Log all parameters for debugging
        const params = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });

        // Check for Phantom error response first
        const errorCode = searchParams.get('errorCode');
        const errorMessage = searchParams.get('errorMessage');

        if (errorCode || errorMessage) {
          throw new Error(`Phantom Error: ${errorMessage || 'Unknown error'} (${errorCode || 'no code'})`);
        }

        // Get the encrypted data and nonce from URL parameters
        const data = searchParams.get('data');
        const nonce = searchParams.get('nonce');

        if (!data || !nonce) {
          throw new Error('Missing transaction data parameters');
        }

        const response = await fetch(`/api/confirm_mobile_transaction`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: data,
            nonce: nonce,
            key: key
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        window.dispatchEvent(new CustomEvent('market-callback-event', {
          detail: { isConnected: true }
        }));

        await new Promise((resolve) => setTimeout(resolve, 200));

        localStorage.removeItem('pending_transaction_market_id');

        // // Redirect back to the market page with success parameter
        router.push(`/market/${marketId}?txSignature=complete`);
      } catch (error) {
        await errorLog("MARKET_CALLBACK_ERROR",
          error.message || 'Error object with empty message',
          error.stack || "no stack trace available",
          "MARKET-CALLBACK",
          "SERIOUS");


          window.dispatchEvent(new CustomEvent('market-callback-event', {
            detail: { isConnected: true }
          }));
  
          await fetch('/api/pending-bets/error/mobile', {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id
            }),
          });

          await new Promise((resolve) => setTimeout(resolve, 200));

          localStorage.removeItem('bp_id');
        // Redirect back to the market page with error parameter
        const errorMessage = error.message || 'Unknown error processing transaction';
        router.push(`/market/${marketId}?error=Critical}`);
      }
    }

    // Wrap the async function call in try-catch
    try {
      processCallback();
    } catch (error) {
      logInfo('call back error', {
        err: error.message
      });
      router.push(`/market/${marketId}?error=Critical+callback+error`);
    }
  }, [searchParams, router]);

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold mb-4">Processing Transaction</h1>
      <p>Please wait while we process your transaction...</p>
    </div>
  );
}

export default function MarketCallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Suspense fallback={
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Loading...</h1>
          <p>Please wait...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
