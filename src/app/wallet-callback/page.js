'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export default function WalletCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      logInfo('Connecting wallet', {
        component: 'WalletCallbackPage',
        action: 'connecting wallet'
      });

      const queryParams = new URLSearchParams(window.location.search);
      const phantomEncryptionPublicKey = queryParams.get('phantom_encryption_public_key');
      const nonce = queryParams.get('nonce');
      const encryptedData = queryParams.get('data');

      if (!phantomEncryptionPublicKey || !nonce || !encryptedData) {
        throw new Error('Missing required connection parameters');
      }

      logInfo('Connection details stored', {
        component: 'WalletCallbackPage',
        phantomEncryptionPublicKey: phantomEncryptionPublicKey,
        nonce: nonce,
        encryptedData: encryptedData
      });
      // Need to implement decryption of the data using your app's private key
      // and the phantom_encryption_public_key to create a shared secret
      // This is a placeholder for where you would decrypt the data
      const decryptedData = decryptPhantomData(phantomEncryptionPublicKey, nonce, encryptedData);

      // Parse the decrypted JSON data
      if (decryptedData) {
        const { public_key, session } = JSON.parse(decryptedData);

        if (public_key && session) {
          // Save public key
          localStorage.setItem('phantomPublicKey', public_key);
          
          // Save session directly as string
          localStorage.setItem('phantomSession', session);

          logInfo('Connection details stored', {
            component: 'WalletCallbackPage',
            publicKey: public_key,
            hasSession: !!session,
            sessionLength: session.length
          });

          // Dispatch custom event with wallet data before redirecting
          const walletEvent = new CustomEvent('wallet-callback-event', {
            detail: {
              publicKey: public_key,
              session
            }
          });

          console.log('Dispatching wallet-callback-event with public key:', public_key);

          logInfo('Dispatching wallet callback-event', {
            component: 'WalletCallBackPage',
            publicKey: public_key
          });

          window.dispatchEvent(walletEvent);

          // Add a verification log
          const savedSession = localStorage.getItem('phantomSession');
          logInfo('Verifying saved session', {
            component: 'WalletCallbackPage',
            sessionSaved: !!savedSession,
            sessionLength: savedSession?.length
          });

          // Short delay to ensure event is processed before redirecting
          setTimeout(() => {
            router.push('/');
          }, 500);
        } else {
          throw new Error('Missing required data in decrypted payload');
        }
      }
    } catch (error) {
      logError(error, {
        component: 'WalletCallbackPage',
        action: 'processing wallet callback'
      });
      console.error('Error processing wallet callback:', error.message);
      router.push('/');
    }
  }, [router]);

  /**
   * Decrypts data from Phantom
   * @param {string} phantomEncryptionPublicKey - The encryption public key from Phantom
   * @param {string} nonce - The nonce from Phantom
   * @param {string} encryptedData - The encrypted data from Phantom
   * @returns {string} - The decrypted data as a string
   */
  function decryptPhantomData(phantomEncryptionPublicKey, nonce, encryptedData) {
    try {
      // Retrieve the private key from localStorage
      const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
      if (!storedPrivateKey) {
        throw new Error('Encryption private key not found in localStorage');
      }

      logInfo('Stored Private Key', {
        component: 'WalletCallBackPage',
        fetchedPrivateKey: storedPrivateKey
      });

      const dappPrivateKey = bs58.decode(storedPrivateKey);

      logInfo('Decoded Stored Private Key', {
        component: 'WalletCallBackPage',
        encoded_dapp_private_key: dappPrivateKey
      });

      // Decode the base58 encoded inputs
      const phantomPublicKey = bs58.decode(phantomEncryptionPublicKey);
      const nonceDecoded = bs58.decode(nonce);
      const dataDecoded = bs58.decode(encryptedData);

      logInfo('Decrypt Phantom Data', {
        component: 'WalletCallBackPage',
        publicKey: phantomPublicKey,
        nonceDecod: nonceDecoded,
        dataDecod: dataDecoded
      });

      // Create shared secret using nacl box
      const sharedSecret = nacl.box.before(phantomPublicKey, dappPrivateKey);

      logInfo('Shared Secret', {
        component: 'WalletCallBackPage',
        sharedsecr: sharedSecret
      });

      // Decrypt the data
      const decryptedData = nacl.box.open.after(dataDecoded, nonceDecoded, sharedSecret);

      logInfo('Decrypted Data', {
        component: 'WalletCallBackPage',
        publicKey: decryptedData
      });

      if (!decryptedData) {
        throw new Error('Failed to decrypt data');
      }

      // Convert the decrypted data to a string
      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      logError(error, {
        component: 'WalletCallBackPage',
        action: 'decrypting phantom data'
      });
      throw new Error('Failed to decrypt Phantom data: ' + error.message);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-blue-900">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Connecting Wallet</h1>
        <p>Please wait while we complete your connection...</p>
      </div>
    </div>
  );
}