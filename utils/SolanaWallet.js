
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
const RPC_ENDPOINT = clusterApiUrl('mainnet-beta');
const WS_ENDPOINT = RPC_ENDPOINT.replace('https', 'wss'); // WebSocket endpoint
import { logInfo, logError } from '@/utils/logger';

export async function checkBalance(publicKey, amount) {
  if (!publicKey) {
    throw new Error('Wallet not connected');
  }


  try {
    const response = await fetch('/api/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey,
        amount,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to check balance');
    }

    const success = result.success;
    const balanceInfo = result.data;

    if (success) {
      return { isEnough: balanceInfo.isEnough, solBalance: balanceInfo.solBalance };
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    throw new Error('Error checking balance:', err);
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
  signTransaction, // Changed from sendTransaction to signTransaction
  amount,
  key,
  token,
  id
  // Removed endpoint parameter since we'll use server
) {
  if (!publicKey) {
    return { success: false, error: 'Wallet not connected' };
  }

  const wallet = new PublicKey(publicKey);
  const destinationWallet = new PublicKey('A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU');

  try {
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

    // Get blockhash from server instead of directly
    const blockhashResponse = await fetch('/api/get-blockhash', {
      method: 'GET',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!blockhashResponse.ok) {
      throw new Error('Failed to get recent blockhash');
    }

    const { blockhash, lastValidBlockHeight } = await blockhashResponse.json();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet;

    const signedTransaction = await signTransaction(transaction);
    
    // Serialize the signed transaction
    const serializedTransaction = Buffer.from(signedTransaction.serialize()).toString('base64');

    // Send to server for submission via QuickNode
    const response = await fetch('/api/submit-transaction', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        serializedTransaction,
        amount,
        key,
        wallet: publicKey.toString(),
        destinationWallet: destinationWallet.toString(),
        id
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Transaction submission failed');
    }

    const result = await response.json();
    const { data, success } = result;

    if (!success) {
      throw new Error(result.error || 'Transaction failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const transactionResponse = await fetch('/api/check-transaction', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        data
      }),
    });

    if (!transactionResponse.ok) {
      const errorData = await transactionResponse.json();
      throw new Error(errorData.error);
    }

    return {
      success: true
    };
  } catch (error) {
    // Provide more specific error messaging
    let errorMessage = error.message;
    if (error.message.includes('User rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Transaction confirmation timed out. Please check Solana Explorer for status.';
    }

    // Update the pending bets with error

    await fetch('/api/pending-bets/error', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        id,
        errorMessage
      }),
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

// Update placeBet function to include marketId
export async function placeBet(
  publicKey,
  signTransaction,
  id,
  //sendTransaction,
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

  if (!betAmount || !userId || !amountToAdd || !betType || !token_name || !id) {
    throw new Error('Inputs cant be empty');
  }

  try {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKeyToCheck = publicKey;

    if (!publicKeyToCheck) {
      throw new Error('Wallet public key not found');
    }

    // Check balance (works for both mobile and web)
    let hasEnough;

    logInfo('Amount to add', {
      component: 'Solana wallet',
      amount: amountToAdd
    });

    try {
      const { isEnough, solBalance } = await checkBalance(publicKeyToCheck, amountToAdd);
      hasEnough = isEnough;
    } catch (error) {
      throw new Error('Failed to fetch wallet balance');
    }

    if (!hasEnough) {
      throw new Error("You don't have enough SOL to place this bet");
    }

    const result = await transferSOL(publicKey, signTransaction, amountToAdd, key, token, id);

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