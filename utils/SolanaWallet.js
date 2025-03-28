// Solana Wallet Utilities
// This file provides functions for Solana wallet interaction including balance checking and transfers

import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, clusterApiUrl, Memo } from '@solana/web3.js';
import { logInfo, logError } from '@/utils/logger';
//import { phantomConnect } from '@/utils/PhantomConnect';
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

    return { isEnough: solBalance >= requiredAmount, solBalance: solBalance };

  } catch (error) {
    console.error('Error checking balance:', error);
    logInfo('Error checking balance', {
      error: error.message,
      publicKey: typeof publicKeyOrString === 'string' ? publicKeyOrString : publicKeyOrString.toString()
    });
    throw new Error(`Failed to check wallet balance: ${error.message}`);
  }
}

export async function checkSufficientBalanceForMobile(amount, endpoint = RPC_ENDPOINT) {
  const publicKeyOrString = localStorage.getItem('phantomPublicKey'); // Retrieve from localStorage

  if (!publicKeyOrString) {
    throw new Error('Wallet not connected on mobile');
  }

  logInfo('Checking balance for mobile', {
    component: 'Solana wallet'
  });

  try {
    const connection = new Connection(endpoint, 'confirmed');

    // Convert string to PublicKey if needed
    const publicKey = new PublicKey(publicKeyOrString);

    const lamports = await connection.getBalance(publicKey);

    const solBalance = lamports / LAMPORTS_PER_SOL;

    logInfo('Sol balance', {
      component: 'Solana wallet',
      balance: solBalance
    });
    // Add small buffer for transaction fees
    const requiredAmount = amount + 0.000005;

    return { isEnough: solBalance >= requiredAmount, solBalance: solBalance };
  } catch (error) {
    console.error('Error checking balance on mobile:', error);
    logInfo('Error checking balance on mobile', {
      error: error.message,
      publicKey: publicKeyOrString
    });
    throw new Error(`Failed to check wallet balance on mobile: ${error.message}`);
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

export async function handleTransaction(data, sendTransaction, onSuccess, onError) {
  const connection = new Connection(RPC_ENDPOINT, {
    commitment: 'confirmed',
    wsEndpoint: WS_ENDPOINT,
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 60000 // 60 seconds
  });

  try {
    const serializedMessage = data.serializedTransaction;
    const transaction = Transaction.from(Buffer.from(serializedMessage, 'base64'));
    
    // Send transaction (this triggers the wallet popup for user approval)
    const signature = await sendTransaction(transaction, connection);

    const result = {
      success: true,
      signature,
      transactionUrl: `https://explorer.solana.com/tx/${signature}`
    };

    onSuccess(result);
  } catch (error) {
    console.error('Transaction failed:', error);

    const result = {
      success: false,
      error: error.message
    };

    onError(error.message);
  }
}

// Update placeBet function to include marketId
export async function placeBet(
  publicKey,
  sendTransaction,
  betAmount, // Full bet amount without fees / will be added to create bet
  onSuccess,
  onError,
  setLoading = null,
  isMobile = false,
  marketId = null, // Add marketId parameter
  userId,
  amountToAdd, // This is the amount needed to be fetched from wallet
  betType,
  token_name,
  token
) {
  if (setLoading) setLoading(true);

  if (!betAmount || !userId || !amountToAdd || !betType || !token_name) {
    throw new Error('Inputs cant be empty');
  }

  logInfo('Placing bet', {
    component: 'Solana Wallet',
    pubKey: publicKey,
    isMobile: isMobile
  });

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
    let hasEnough;

    if (isMobile) {
      try {
        const { isEnough } = await checkSufficientBalanceForMobile(amountToAdd);
        hasEnough = isEnough;
      } catch (error) {
        throw new Error('Failed to fetch wallet balance');
      }

    } else {
      try {
        const { isEnough } = await checkSufficientBalance(publicKeyToCheck, amountToAdd);
        hasEnough = isEnough;
      } catch (error) {
        throw new Error('Failed to fetch wallet balance');
      }
    }

    if (!hasEnough) {
      throw new Error("You don't have enough SOL to place this bet");
    }

    if (isMobile) {
      if (!marketId) {
        throw new Error('Market ID is required for mobile transactions');
      }
      // Handle mobile transaction

      // Store pending transaction info
      localStorage.setItem('pending_transaction_amount', betAmount.toString());
      localStorage.setItem('pending_transaction_timestamp', Date.now().toString());
      localStorage.setItem('pending_transaction_market_id', marketId);

      try {
        // if (!phantomConnect) {
        //   throw new Error('PhantomConnect not initialized');
        // }

        // await phantomConnect.signAndSendTransaction(amountToAdd, publicKeyToCheck);

        logInfo('Bet was successfull on mobile', {
          component: 'Solana wallet'
        });

      } catch (error) {
        logError(error, {
          component: 'Solana Wallet',
          action: 'placing bet'
        });
        throw error;
      }
    } else {
      // Handle web transaction as before
      const result = await transferSOL(publicKey, sendTransaction, amountToAdd);

      if (result.success) {
        // we can call the endpoint from here

        const response = await fetch(`/api/betting/transfer`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            marketId: marketId,
            userId: userId,
            amountToAddToBalance: amountToAdd,
            amount: betAmount,
            betType: betType,
            token_name: token_name
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          logInfo('Error placing bet', {
            errorData: errorData,
            component: 'Market Page'
          });
          throw new Error(errorData.message || errorData.error || 'Error saving bet details');
        }
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