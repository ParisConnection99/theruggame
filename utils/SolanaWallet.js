// Solana Wallet Utilities
// This file provides functions for Solana wallet interaction including balance checking and transfers

import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { logInfo, logError } from '@/utils/logger';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
// Constants - Replace with your values in production
// Use a more reliable devnet RPC with proper WebSocket support
// Using clusterApiUrl for more reliable connections
const RPC_ENDPOINT = clusterApiUrl('devnet'); // More reliable than direct URL
//const RPC_ENDPOINT = clusterApiUrl('mainnet-beta');
const WS_ENDPOINT = RPC_ENDPOINT.replace('https', 'wss'); // WebSocket endpoint
const SITE_WALLET_ADDRESS = 'A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU'; // Replace with your wallet address
//const SITE_WALLET_ADDRESS = process.env.SITE_WALLET_ADDRESS;

/**
 * Checks if a user has sufficient SOL balance for a transaction
 * @param {PublicKey} publicKey - The user's wallet public key
 * @param {number} amount - The amount of SOL to check for (plus a small buffer for fees)
 * @param {string} [endpoint=RPC_ENDPOINT] - Optional custom RPC endpoint
 * @returns {Promise<boolean>} Whether the user has sufficient balance
 */
export async function checkSufficientBalance(publicKeyOrString, amount, endpoint = RPC_ENDPOINT) {
  if (!publicKeyOrString) {
    throw new Error('Wallet not connected');
  }

  try {
    const connection = new Connection(endpoint, 'confirmed');

    // Convert string to PublicKey if needed
    const publicKey = typeof publicKeyOrString === 'string'
      ? new PublicKey(publicKeyOrString)
      : publicKeyOrString;

    const lamports = await connection.getBalance(publicKey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // Add small buffer for transaction fees
    const requiredAmount = amount + 0.000005;

    return solBalance >= requiredAmount;
  } catch (error) {
    console.error('Error checking balance:', error);
    logInfo('Error checking balance', {
      error: error.message,
      publicKey: typeof publicKeyOrString === 'string' ? publicKeyOrString : publicKeyOrString.toString()
    });
    throw new Error(`Failed to check wallet balance: ${error.message}`);
  }
}
// export async function checkSufficientBalance(publicKey, amount, endpoint = RPC_ENDPOINT) {
//   if (!publicKey) {
//     throw new Error('Wallet not connected');
//   }

//   try {
//     const connection = new Connection(endpoint, 'confirmed');
//     const lamports = await connection.getBalance(publicKey);
//     const solBalance = lamports / LAMPORTS_PER_SOL;

//     // Add small buffer for transaction fees
//     const requiredAmount = amount + 0.000005;

//     return solBalance >= requiredAmount;
//   } catch (error) {
//     console.error('Error checking balance:', error);
//     logInfo('Error checking balance', {});
//     throw new Error(`Failed to check wallet balance: ${error.message}`);
//   }
// }

/**
 * Transfers SOL from user wallet to the site wallet
 * @param {PublicKey} publicKey - The sender's wallet public key
 * @param {Function} sendTransaction - The wallet adapter's sendTransaction function
 * @param {number} amount - The amount of SOL to transfer
 * @param {string} [destinationAddress=SITE_WALLET_ADDRESS] - Optional custom destination address
 * @param {string} [endpoint=RPC_ENDPOINT] - Optional custom RPC endpoint
 * @returns {Promise<{success: boolean, signature?: string, error?: string}>} Transaction result
 */
export async function transferSOL(
  publicKey,
  sendTransaction,
  amount,
  destinationAddress = SITE_WALLET_ADDRESS,
  endpoint = RPC_ENDPOINT
) {
  if (!publicKey) {
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    // Use connectionless approach to avoid WebSocket issues
    // The sendTransaction function already has a connection from the wallet adapter
    const connection = new Connection(endpoint, {
      commitment: 'confirmed',
      wsEndpoint: WS_ENDPOINT,
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 60000 // 60 seconds
    });
    const destinationWallet = new PublicKey(destinationAddress);

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: destinationWallet,
        lamports: Math.round(amount * LAMPORTS_PER_SOL) // Ensure we use integer lamports
      })
    );

    // Get blockhash only once
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Send transaction (this triggers the wallet popup for user approval)
    const signature = await sendTransaction(transaction, connection);

    // Confirm with parameters that don't rely on WebSockets
    const confirmation = await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    }, 'confirmed');

    // Check for timeout errors
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    // If we get here, the transaction was confirmed
    return {
      success: true,
      signature,
      transactionUrl: `https://explorer.solana.com/tx/${signature}`
    };
  } catch (error) {
    console.error('Transaction failed:', error);

    // Provide more specific error messaging
    let errorMessage = error.message;
    if (error.message.includes('User rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Transaction confirmation timed out. Please check Solana Explorer for status.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

// Update placeBet function to include marketId
export async function placeBet(
  publicKey,
  sendTransaction,
  betAmount,
  onSuccess,
  onError,
  setLoading = null,
  isMobile = false,
  marketId = null // Add marketId parameter
) {
  if (setLoading) setLoading(true);

  try {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    // For mobile, get the public key from localStorage
    const publicKeyToCheck = isMobile
      ? localStorage.getItem('phantomPublicKey')
      : publicKey;

    if (!publicKeyToCheck) {
      throw new Error('Wallet public key not found');
    }

    // Check balance (works for both mobile and web)
    const hasEnough = await checkSufficientBalance(publicKeyToCheck, betAmount);
    if (!hasEnough) {
      throw new Error("You don't have enough SOL to place this bet");
    }

    if (isMobile) {
      if (!marketId) {
        throw new Error('Market ID is required for mobile transactions');
      }
      // Handle mobile transaction
      const deepLink = await createMobileTransactionDeepLink(betAmount, marketId);

      // Store pending transaction info
      localStorage.setItem('pending_transaction_amount', betAmount.toString());
      localStorage.setItem('pending_transaction_timestamp', Date.now().toString());
      localStorage.setItem('pending_transaction_market_id', marketId);

      logInfo('Deep Link', {
        deepLink: deepLink
      });

      // Redirect to Phantom app
      window.location.href = deepLink;
    } else {
      // Handle web transaction as before
      const result = await transferSOL(publicKey, sendTransaction, betAmount);

      if (result.success) {
        onSuccess(result);
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    logError(error, {
      component: 'Solana wallet',
      platform: isMobile ? 'mobile' : 'web'
    });
    onError(error.message);
  } finally {
    if (setLoading && !isMobile) setLoading(false);
  }
}

/**
 * Example usage function for placing a bet
 * This combines balance checking and transfer in one convenient function
 * @param {PublicKey} publicKey - The user's wallet public key
 * @param {Function} sendTransaction - The wallet adapter's sendTransaction function
 * @param {number} betAmount - The amount of SOL to bet
 * @param {Function} onSuccess - Success callback function
 * @param {Function} onError - Error callback function
 * @param {Function} [setLoading] - Optional loading state setter function
 */
// export async function placeBet(
//   publicKey, 
//   sendTransaction, 
//   betAmount, 
//   onSuccess, 
//   onError, 
//   setLoading = null
// ) {
//   // Set loading state if provided
//   if (setLoading) setLoading(true);

//   try {
//     if (!publicKey) {
//       throw new Error('Wallet not connected');
//     }

//     // Check balance
//     const hasEnough = await checkSufficientBalance(publicKey, betAmount);
//     if (!hasEnough) {
//       throw new Error("You don't have enough SOL to place this bet");
//     }

//     logInfo('Bet Amount', {
//       amount: betAmount,
//       component: 'Solana wallet'
//     })

//     // Transfer SOL
//     const result = await transferSOL(publicKey, sendTransaction, betAmount);

//     logInfo('Transaction result', {
//       component: 'Solana wallet',
//       transferResult: result
//     });

//     if (result.success) {
//       onSuccess(result);
//     } else {
//       logError(result.error, {
//         component: 'Solana wallet'
//       });
//       throw new Error(result.error);
//     }
//   } catch (error) {
//     onError(error.message);
//   } finally {
//     // Clear loading state
//     if (setLoading) setLoading(false);
//   }
// }

// New function for mobile transactions
export async function createMobileTransactionDeepLink(
  amount,
  marketId,
  destinationAddress = SITE_WALLET_ADDRESS,
  endpoint = RPC_ENDPOINT
) {
  try {
    // Get stored encryption keys and session
    const dappEncryptionPublicKey = localStorage.getItem('dappEncryptionPublicKey');
    const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
    const session = localStorage.getItem('phantomSession');
    
    if (!dappEncryptionPublicKey || !storedPrivateKey || !session) {
      throw new Error('Encryption keys or session not found');
    }

    // Create connection and get latest blockhash
    const connection = new Connection(endpoint, 'confirmed');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Create transaction
    const transaction = new Transaction();
    
    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(localStorage.getItem('phantomPublicKey')),
        toPubkey: new PublicKey(destinationAddress),
        lamports: Math.round(amount * LAMPORTS_PER_SOL)
      })
    );

    // Set recent blockhash and fee payer
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(localStorage.getItem('phantomPublicKey'));

    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    // Create the payload
    const payload = {
      session,
      transaction: bs58.encode(serializedTransaction),
    };

    // Generate new nonce
    const nonce = nacl.randomBytes(24);
    const nonceBase58 = bs58.encode(nonce);

    // Create shared secret
    const sharedSecret = nacl.box.before(
      bs58.decode(dappEncryptionPublicKey),
      bs58.decode(storedPrivateKey)
    );

    // Encrypt the payload
    const messageUint8 = new TextEncoder().encode(JSON.stringify(payload));
    const encryptedData = nacl.box.after(
      messageUint8,
      nonce,
      sharedSecret
    );

    logInfo('Market ID', {
      marketId: marketId
    });

    // Update the redirect URL to use the new callback page
    const redirectUrl = encodeURIComponent(`https://theruggame.fun/market-callback`);

    // Create deep link parameters
    const params = new URLSearchParams({
      dapp_encryption_public_key: dappEncryptionPublicKey,
      nonce: nonceBase58,
      redirect_link: redirectUrl,
      payload: bs58.encode(encryptedData)
    });

    const deepLink = `https://phantom.app/ul/v1/signAndSendTransaction?${params.toString()}`;

    logInfo('Deep Link', {
      deepLink: deepLink
    });

    return deepLink;
  } catch (error) {
    console.error('Error creating mobile transaction:', error);
    logError(error, {
      component: 'Solana wallet',
      platform: 'mobile'
    });
    throw error;
  }
}

/**
 * Handles the transaction callback from Phantom mobile wallet
 * @param {string} encryptedData - The encrypted data from Phantom
 * @param {string} nonceString - The nonce used for encryption, in base58
 * @returns {Promise<string>} The transaction signature
 */
export async function handleTransactionCallback(encryptedData, nonceString) {
  try {
    // Get stored encryption keys
    const dappEncryptionPublicKey = localStorage.getItem('dappEncryptionPublicKey');
    const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
    
    if (!dappEncryptionPublicKey || !storedPrivateKey) {
      throw new Error('Encryption keys not found');
    }

    // Decode the encrypted data and nonce from base58
    const nonce = bs58.decode(nonceString);
    const encryptedBytes = bs58.decode(encryptedData);

    // Create shared secret
    const sharedSecret = nacl.box.before(
      bs58.decode(dappEncryptionPublicKey),
      bs58.decode(storedPrivateKey)
    );

    // Decrypt the data
    const decryptedData = nacl.box.open.after(
      encryptedBytes,
      nonce,
      sharedSecret
    );

    if (!decryptedData) {
      throw new Error('Failed to decrypt transaction data');
    }

    // Parse the decrypted data
    const decodedData = new TextDecoder().decode(decryptedData);
    const { signature } = JSON.parse(decodedData);

    if (!signature) {
      throw new Error('No signature found in response');
    }

    logInfo('Transaction callback processed', {
      signature,
      component: 'Solana wallet'
    });

    return signature;
  } catch (error) {
    logError(error, {
      component: 'Solana wallet',
      action: 'Processing transaction callback'
    });
    throw new Error(`Failed to process transaction callback: ${error.message}`);
  }
}