'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleTransactionCallback } from '@/utils/SolanaWallet';
import { logInfo, logError } from '@/utils/logger';
import { decryptPayload, getUint8ArrayFromJsonString } from '@/utils/PhantomConnect';
import CryptoJS from 'crypto-js';

const encryptKey = process.env.ENCRYPTION_KEY;

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function processCallback() {
      // Initialize marketId early to ensure it's available for error handling
      const marketId = localStorage.getItem('pending_transaction_market_id');

      try {
        // Log all parameters for debugging
        const params = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });
        console.log('Received parameters:', params);

        // Check for Phantom error response first
        const errorCode = searchParams.get('errorCode');
        const errorMessage = searchParams.get('errorMessage');

        if (errorCode || errorMessage) {
          logError('Phantom Error:', {
            errorCode,
            errorMessage
          });
          throw new Error(`Phantom Error: ${errorMessage || 'Unknown error'} (${errorCode || 'no code'})`);
        }

        // Get the encrypted data and nonce from URL parameters
        const data = searchParams.get('data');
        const nonce = searchParams.get('nonce');

        logInfo('Transaction data:', { data, nonce });

        if (!data || !nonce) {
          throw new Error('Missing transaction data parameters');
        }

        const sharedSecret = localStorage.getItem('phantomSharedSecret');

        const convertedSharedSecret = getUint8ArrayFromJsonString(sharedSecret);

        // Process the transaction callback
        //const signature = await handleTransactionCallback(data, nonce);
        const signature = decryptPayload(data, nonce, convertedSharedSecret);

        // Get the stored transaction details
        const amount = localStorage.getItem('pending_transaction_amount');

        // Log successful transaction
        logInfo('Transaction processed:', {
          signature,
          marketId,
          amount
        });

        await completeBetAndBalanceUpdate();

        // Clear stored transaction data
        localStorage.removeItem('pending_transaction_amount');
        localStorage.removeItem('pending_transaction_timestamp');
        localStorage.removeItem('pending_transaction_market_id');

        // Redirect back to the market page with success parameter
        router.push(`/market/${marketId}?txSignature=${signature}`);
      } catch (error) {
        logError('Error in callback:', {
          marketId,
          error: error.message
        });
        console.error('Error in callback:', error);

        // Clear stored transaction data
        try {
          localStorage.removeItem('pending_transaction_amount');
          localStorage.removeItem('pending_transaction_timestamp');
          localStorage.removeItem('pending_transaction_market_id');
        } catch (e) {
          console.error('Error clearing localStorage:', e);
        }

        // Redirect back to the market page with error parameter
        const errorMessage = error.message || 'Unknown error processing transaction';
        router.push(`/market/${marketId}?error=${encodeURIComponent(errorMessage)}`);
      }
    }

    // Wrap the async function call in try-catch
    try {
      processCallback();
    } catch (error) {
      console.error('Critical error in callback:', error);
      // Fallback redirect in case of critical error
      router.push('/market/1544?error=Critical+callback+error');
    }
  }, [searchParams, router]);

  async function completeBetAndBalanceUpdate() {
    const encryptedBalanceResponse = localStorage.getItem('encryptedBalanceData');
    const encryptedBetResponse = localStorage.getItem('encryptedBetData');
  
    if (encryptedBetResponse && encryptedBalanceResponse) {
      try {
        // Decrypt the balance response
        const decryptedBalanceBytes = CryptoJS.AES.decrypt(encryptedBalanceResponse, encryptKey);
        const decryptedBalanceData = JSON.parse(decryptedBalanceBytes.toString(CryptoJS.enc.Utf8));
  
        // Decrypt the bet response
        const decryptedBetBytes = CryptoJS.AES.decrypt(encryptedBetResponse, encryptKey);
        const decryptedBetData = JSON.parse(decryptedBetBytes.toString(CryptoJS.enc.Utf8));
  
        // Log the decrypted data
        logInfo('Decrypted data', {
          component: 'Market-callback',
          balance: decryptedBalanceData,
          bet: decryptedBetData,
        });
  
        // Update user balance
        const updatedUserResponse = await fetch(`/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decryptedBalanceData),
        });
  
        if (!updatedUserResponse.ok) {
          const errorData = await updatedUserResponse.json();
          logInfo('Error updating users balance', { errorMessage: errorData });
          throw new Error(errorData.message || errorData.error || 'Error recording bet');
        }
  
        // Create the bet in the database
        const response = await fetch(`/api/betting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decryptedBetData),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          logInfo('Error creating bet in database', { errorMessage: errorData });
          throw new Error(errorData.message || errorData.error || 'Error recording bet');
        }
  
        // Remove the encrypted data from localStorage after successful processing
        localStorage.removeItem('encryptedBalanceData');
        localStorage.removeItem('encryptedBetData');
  
        logInfo('Encrypted data removed from localStorage', {
          component: 'Market-callback',
        });
      } catch (error) {
        logError('Error decrypting or processing data', {
          component: 'Market-callback',
          error: error.message,
        });
        console.error('Error decrypting or processing data:', error);
      }
    } else {
      logError('Missing encrypted data in localStorage', {
        component: 'Market-callback',
      });
    }
  }

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
