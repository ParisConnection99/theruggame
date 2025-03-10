'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError } from '@/utils/logger';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export default function WalletCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Connecting wallet...');
  
  useEffect(() => {
    async function processCallback() {
      try {
        // Parse query parameters from the URL
        const queryParams = new URLSearchParams(window.location.search);
        
        // Get the parameters from Phantom's response
        const phantomEncryptionPublicKey = queryParams.get('phantom_encryption_public_key');
        const nonce = queryParams.get('nonce');
        const encryptedData = queryParams.get('data');
        
        logInfo('Received wallet callback parameters', {
          component: 'WalletCallbackPage',
          hasPhantomKey: !!phantomEncryptionPublicKey,
          hasNonce: !!nonce,
          hasData: !!encryptedData
        });
        
        if (!phantomEncryptionPublicKey || !nonce || !encryptedData) {
          setStatus('Missing required parameters');
          throw new Error('Missing required connection parameters');
        }

        // Retrieve the private key that was stored during connection initiation
        const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
        if (!storedPrivateKey) {
          setStatus('Encryption key not found');
          throw new Error('Encryption private key not found in localStorage');
        }

        // Decrypt the data from Phantom
        const decryptedData = await decryptPhantomData(
          phantomEncryptionPublicKey, 
          nonce, 
          encryptedData, 
          storedPrivateKey
        );
        
        // Parse the decrypted JSON data
        const { public_key, session } = JSON.parse(decryptedData);
        
        logInfo('Successfully decrypted data', {
          component: 'WalletCallbackPage',
          publicKey: public_key,
        });
        
        if (public_key && session) {
          // Store the connection details in localStorage
          localStorage.setItem('phantomPublicKey', public_key);
          localStorage.setItem('phantomSession', session);
          localStorage.setItem('wallet_return_reconnect', 'true');
          localStorage.setItem('wallet_return_timestamp', Date.now().toString());
          
          // Dispatch custom event with wallet data before redirecting
          const walletEvent = new CustomEvent('wallet-callback-event', {
            detail: {
              publicKey: public_key,
              session
            }
          });
          
          console.log('Dispatching wallet-callback-event with public key:', public_key);
          window.dispatchEvent(walletEvent);
          
          setStatus('Connected successfully! Redirecting...');
          
          // Short delay to ensure event is processed before redirecting
          setTimeout(() => {
            // Redirect the user to the main app page
            router.push('/');
          }, 1000);
        } else {
          setStatus('Missing data in decrypted payload');
          throw new Error('Missing required data in decrypted payload');
        }
      } catch (error) {
        // Catch any errors that might occur
        logError(error, {
          component: 'WalletCallBackPage',
          action: 'processing wallet callback'
        });
        console.error('Error processing wallet callback:', error.message);
        
        // Set error status but still redirect after a delay
        setStatus(`Error: ${error.message}`);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    }

    processCallback();
  }, [router]);

  /**
   * Decrypts data from Phantom
   * @param {string} phantomEncryptionPublicKey - The encryption public key from Phantom
   * @param {string} nonce - The nonce from Phantom
   * @param {string} encryptedData - The encrypted data from Phantom
   * @param {string} storedPrivateKey - The stored private key in base58 format
   * @returns {string} - The decrypted data as a string
   */
  async function decryptPhantomData(phantomEncryptionPublicKey, nonce, encryptedData, storedPrivateKey) {
    try {
      console.log('Attempting to decrypt Phantom data');
      
      // Decode the base58 encoded inputs
      const phantomPublicKey = bs58.decode(phantomEncryptionPublicKey);
      const nonceDecoded = bs58.decode(nonce);
      const dataDecoded = bs58.decode(encryptedData);
      const dappPrivateKey = bs58.decode(storedPrivateKey);
      
      // Log lengths to debug potential issues
      console.log('Key lengths:', {
        phantomPublicKey: phantomPublicKey.length,
        nonce: nonceDecoded.length,
        data: dataDecoded.length,
        privateKey: dappPrivateKey.length
      });
      
      // Create shared secret using nacl box
      const sharedSecret = nacl.box.before(phantomPublicKey, dappPrivateKey);
      
      // Decrypt the data
      const decryptedData = nacl.box.open.after(dataDecoded, nonceDecoded, sharedSecret);
      
      if (!decryptedData) {
        throw new Error('Failed to decrypt data');
      }
      
      // Convert the decrypted data to a string
      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Decryption error:', error);
      logError(error, {
        component: 'WalletCallBackPage',
        action: 'decrypting phantom data'
      });
      throw new Error('Failed to decrypt Phantom data: ' + error.message);
    }
  }

  return (
    <div></div>
  );
}