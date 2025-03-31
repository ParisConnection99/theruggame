// Solana Wallet Utilities
// This file provides functions for Solana wallet interaction including balance checking and transfers

import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { logInfo, logError } from '@/utils/logger';
import { createMemoInstruction } from '@solana/spl-memo';
const RPC_ENDPOINT = clusterApiUrl('devnet'); // More reliable than direct URL
//const RPC_ENDPOINT = clusterApiUrl('mainnet-beta');
const WS_ENDPOINT = RPC_ENDPOINT.replace('https', 'wss'); // WebSocket endpoint

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

    return { isEnough: solBalance >= requiredAmount, solBalance: solBalance };

  } catch (error) {
    throw new Error(`Failed to check wallet balance: ${error.message}`);
  }
}

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
  key,
  token,
  endpoint = RPC_ENDPOINT
) {
  if (!publicKey) {
    return { success: false, error: 'Wallet not connected' };
  }

  const wallet = new PublicKey(publicKey);
  const destinationWallet = new PublicKey('A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU');

  try {
    // Use connectionless approach to avoid WebSocket issues
    // The sendTransaction function already has a connection from the wallet adapter
    const connection = new Connection(endpoint, {
      commitment: 'confirmed',
      wsEndpoint: WS_ENDPOINT,
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 60000 // 60 seconds
    });

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: destinationWallet,
        lamports: Math.round(amount * LAMPORTS_PER_SOL) // Ensure we use integer lamports
      })
    );

    transaction.add(
      createMemoInstruction(`${key}`, [wallet])
    );

    // Get blockhash only once
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet;

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

    const response = await fetch('/api/confirm_transaction', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        signature
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData
      };
    }

    return {
      success: true,
      signature,
      transactionUrl: `https://explorer.solana.com/tx/${signature}`
    };
  } catch (error) {
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

export async function placeBet(
  publicKey,
  sendTransaction,
  betAmount, // Full bet amount without fees / will be added to create bet
  onSuccess,
  onError,
  setLoading = null,
  userId,
  amountToAdd, // This is the amount needed to be fetched from wallet
  betType,
  token_name,
  token,
  key
) {
  if (setLoading) setLoading(true);

  if (!betAmount || !userId || !amountToAdd || !betType || !token_name) {
    throw new Error('Inputs cant be empty');
  }

  try {

    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const { hasEnough } = await checkSufficientBalance(publicKeyToCheck, amountToAdd);

    if (!hasEnough) {
      throw new Error("You don't have enough SOL to place this bet");
    }

    const result = await transferSOL(publicKey, sendTransaction, amountToAdd, key, token);

    if (result.success) {
      // we can call the endpoint from here to check if successful
      onSuccess(result);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    onError(error.message);
  } finally {
    if (setLoading) setLoading(false);
  }

}

// Update placeBet function to include marketId
// export async function placeBet(
//   publicKey,
//   sendTransaction,
//   betAmount, // Full bet amount without fees / will be added to create bet
//   onSuccess,
//   onError,
//   setLoading = null,
//   isMobile = false,
//   marketId = null, // Add marketId parameter
//   userId,
//   amountToAdd, // This is the amount needed to be fetched from wallet
//   betType,
//   token_name,
//   token,
//   key
// ) {
//   if (setLoading) setLoading(true);

//   if (!betAmount || !userId || !amountToAdd || !betType || !token_name) {
//     throw new Error('Inputs cant be empty');
//   }

//   try {
//     if (!publicKey) {
//       throw new Error('Wallet not connected');
//     }

//     // For mobile, get the public key from localStorage
//     const publicKeyToCheck = publicKey;

//     if (!publicKeyToCheck) {
//       throw new Error('Wallet public key not found');
//     }

//     // Check balance (works for both mobile and web)
//     let hasEnough;

//     if (isMobile) {
//       try {
//         const { isEnough } = await checkSufficientBalanceForMobile(amountToAdd);
//         hasEnough = isEnough;
//       } catch (error) {
//         throw new Error('Failed to fetch wallet balance');
//       }

//     } else {
//       try {
//         const { isEnough } = await checkSufficientBalance(publicKeyToCheck, amountToAdd);
//         hasEnough = isEnough;
//       } catch (error) {
//         throw new Error('Failed to fetch wallet balance');
//       }
//     }

//     if (!hasEnough) {
//       throw new Error("You don't have enough SOL to place this bet");
//     }

//     const result = await transferSOL(publicKey, sendTransaction, amountToAdd, key, token);

//     if (result.success) {
//       // we can call the endpoint from here to check if successful
//       onSuccess(result);
//     } else {
//       throw new Error(result.error);
//     }

//   } catch (error) {
//     logError(error, {
//       component: 'Solana wallet',
//       platform: isMobile ? 'mobile' : 'web'
//     });
//     onError(error.message);
//   } finally {
//     if (setLoading && !isMobile) setLoading(false);
//   }
// }