
// app/api/balance/route.js
import { NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Store this in your .env.local file
const QUICKNODE_RPC_ENDPOINT = process.env.QUICKNODE_RPC_ENDPOINT || 
  "https://few-dry-firefly.solana-mainnet.quiknode.pro/b33411d44f2ef89fb9aa9e2f929b6541debb9fc6/";

/**
 * Checks if wallet has sufficient SOL balance
 * @param {string} walletAddress - The public key of the wallet
 * @param {number} amount - The amount of SOL needed
 * @returns {Promise<Object>} - Object containing balance info
 */
async function checkSufficientBalance(walletAddress, amount) {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  try {
    const connection = new Connection(QUICKNODE_RPC_ENDPOINT, 'confirmed');
    
    // Verify the wallet address is valid
    let publicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (error) {
      throw new Error('Invalid wallet address');
    }

    // Get balance with retry logic
    let attempts = 3;
    let lamports;
    
    while (attempts > 0) {
      try {
        lamports = await connection.getBalance(publicKey);
        break;
      } catch (retryError) {
        attempts--;
        
        if (attempts === 0) {
          throw retryError;
        }
        
        // Wait between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const solBalance = lamports / LAMPORTS_PER_SOL;
    
    // Add small buffer for transaction fees
    const requiredAmount = amount ? Number(amount) + 0.000005 : 0;

    return { 
      isEnough: requiredAmount ? solBalance >= requiredAmount : true, 
      solBalance: solBalance, 
      requiredAmount: requiredAmount || 0
    };

  } catch (error) {
    console.error(`Balance check error:`, error);
    throw new Error(`Failed to check wallet balance: ${error.message}`);
  }
}

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { walletAddress, amount } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const balanceInfo = await checkSufficientBalance(walletAddress, amount);
    
    return NextResponse.json({
      success: true,
      data: balanceInfo
    });
    
  } catch (error) {
    console.error('API route error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}