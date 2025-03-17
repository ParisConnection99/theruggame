'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleTransactionCallback } from '@/utils/SolanaWallet';
import { logInfo, logError } from '@/utils/logger';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function processCallback() {
      try {
        // Check for Phantom error response
        const errorCode = searchParams.get('errorCode');
        const errorMessage = searchParams.get('errorMessage');

        if (errorCode || errorMessage) {
          throw new Error(`Phantom Error: ${errorMessage || 'Unknown error'} (${errorCode || 'no code'})`);
        }

        // Log all search parameters for debugging
        console.log('Search params:', Object.fromEntries(searchParams.entries()));
        logInfo('Search params', {
          params: Object.fromEntries(searchParams.entries())
        });
        
        // Get the encrypted data and nonce from URL parameters
        // Phantom might be using different parameter names
        const data = searchParams.get('data') || searchParams.get('encrypted_data');
        const nonce = searchParams.get('nonce');

        console.log('Data:', data);
        console.log('Nonce:', nonce);

        if (!data || !nonce) {
          const marketId = localStorage.getItem('pending_transaction_market_id') || '1544';
          console.error('Missing data or nonce in URL parameters');
          logError('Missing transaction data', {
            marketId: marketId,
            data: data,
            nonce: nonce
          });
          throw new Error('Missing transaction data');
        }

        // Process the transaction callback
        const signature = await handleTransactionCallback(data, nonce);

        // Get the stored market ID and transaction details
        const marketId = localStorage.getItem('pending_transaction_market_id');
        const amount = localStorage.getItem('pending_transaction_amount');

        // Log successful transaction
        console.log('Transaction successful:', signature);

        // Clear stored transaction data
        localStorage.removeItem('pending_transaction_amount');
        localStorage.removeItem('pending_transaction_timestamp');
        localStorage.removeItem('pending_transaction_market_id');

        // Redirect back to the market page with success parameter
        router.push(`/market/${marketId}?txSignature=${signature}`);
      } catch (error) {
        console.error('Error processing transaction:', error);
        logError('Transaction error', {
          marketId: marketId,
          error: error.message
        });
        // Get the market ID for redirect
        const marketId = localStorage.getItem('pending_transaction_market_id');
        
        // Clear stored transaction data
        localStorage.removeItem('pending_transaction_amount');
        localStorage.removeItem('pending_transaction_timestamp');
        localStorage.removeItem('pending_transaction_market_id');

        // Redirect back to the market page with detailed error
        router.push(`/market/${marketId}?error=${encodeURIComponent(error.message)}`);
      }
    }

    processCallback();
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
