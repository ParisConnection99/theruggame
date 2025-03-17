// Solana Wallet Utilities
// This file provides functions for Solana wallet interaction including balance checking and transfers

import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { logInfo, logError } from '@/utils/logger';
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
export async function checkSufficientBalance(publicKey, amount, endpoint = RPC_ENDPOINT) {
  if (!publicKey) {
    throw new Error('Wallet not connected');
  }
  
  try {
    const connection = new Connection(endpoint, 'confirmed');
    const lamports = await connection.getBalance(publicKey);
    const solBalance = lamports / LAMPORTS_PER_SOL;
    
    // Add small buffer for transaction fees
    const requiredAmount = amount + 0.000005;
    
    return solBalance >= requiredAmount;
  } catch (error) {
    console.error('Error checking balance:', error);
    logInfo('Error checking balance', {});
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

export async function placeBet(
  publicKey, 
  sendTransaction, 
  betAmount, 
  onSuccess, 
  onError, 
  setLoading = null,
  isMobile = false // Add isMobile parameter
) {
  if (setLoading) setLoading(true);
  
  try {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }
    
    // Check balance (works for both mobile and web)
    const hasEnough = await checkSufficientBalance(publicKey, betAmount);
    if (!hasEnough) {
      throw new Error("You don't have enough SOL to place this bet");
    }

    logInfo('Bet Amount', {
      amount: betAmount,
      component: 'Solana wallet',
      platform: isMobile ? 'mobile' : 'web'
    });
    
    if (isMobile) {
      // Handle mobile transaction
      const deepLink = await createMobileTransactionDeepLink(betAmount);
      
      // Store pending transaction info
      localStorage.setItem('pending_transaction_amount', betAmount.toString());
      localStorage.setItem('pending_transaction_timestamp', Date.now().toString());
      
      // Redirect to Phantom app
      window.location.href = deepLink;
      
      // Note: The actual success callback will be handled in the wallet-callback page
      // This function will not complete as we're redirecting
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
  destinationAddress = SITE_WALLET_ADDRESS,
  endpoint = RPC_ENDPOINT
) {
  try {
    // Get stored encryption keys
    const dappEncryptionPublicKey = localStorage.getItem('dappEncryptionPublicKey');
    const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
    
    if (!dappEncryptionPublicKey || !storedPrivateKey) {
      throw new Error('Encryption keys not found');
    }

    // Create the transaction payload
    const payload = {
      session: localStorage.getItem('phantomSession'), // Get stored session
      transaction: {
        type: 'transfer',
        amount: amount,
        destination: destinationAddress,
      }
    };

    // Generate new nonce
    const nonce = nacl.randomBytes(24);
    const nonceBase58 = bs58.encode(nonce);

    // Encrypt the payload
    const dappPrivateKey = bs58.decode(storedPrivateKey);
    const messageUint8 = new TextEncoder().encode(JSON.stringify(payload));
    const encryptedData = nacl.box.after(
      messageUint8,
      nonce,
      nacl.box.before(
        bs58.decode(dappEncryptionPublicKey),
        dappPrivateKey
      )
    );

    // Create deep link parameters
    const params = new URLSearchParams({
      dapp_encryption_public_key: dappEncryptionPublicKey,
      nonce: nonceBase58,
      redirect_link: 'https://theruggame.fun/wallet-callback',
      payload: bs58.encode(encryptedData)
    });

    return `https://phantom.app/ul/v1/transfer?${params.toString()}`;
  } catch (error) {
    console.error('Error creating mobile transaction:', error);
    throw error;
  }
}