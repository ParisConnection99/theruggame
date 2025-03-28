"use server";
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, createMemoInstruction, clusterApiUrl } from '@solana/web3.js';
import { logInfo, logError } from '@/utils/logger';
const RPC_ENDPOINT = clusterApiUrl('devnet');
const WS_ENDPOINT = RPC_ENDPOINT.replace('https', 'wss'); // WebSocket endpoint
const SITE_WALLET_ADDRESS = 'A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU';


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

export async function createDesktopTransaction(usersAddress, amount, nonce, betId) {
    if (!usersAddress) {
        throw new Error('Wallet not connected.');
    }

    try {
        const usersWallet = new PublicKey(usersAddress);
        const siteWallet = new PublicKey(SITE_WALLET_ADDRESS);

        const connection = new Connection(RPC_ENDPOINT, {
            commitment: 'confirmed',
            wsEndpoint: WS_ENDPOINT,
            disableRetryOnRateLimit: false,
            confirmTransactionInitialTimeout: 60000 // 60 seconds
        });

        const memoText = `${nonce}:${betId}`;
        const memoInstruction = new Memo({ memo: memoText });
        memoInstruction.key = usersWallet; // Important!

        // Create transfer instruction
        const transferInstruction = SystemProgram.transfer({
            fromPubkey: usersWallet,
            toPubkey: siteWallet,
            lamports: Math.round(amount * LAMPORTS_PER_SOL)
        });

        // Create transaction
        const transaction = new Transaction();
        transaction.add(memoInstruction); // Add the Memo instruction FIRST
        transaction.add(transferInstruction); // Then add the transfer instruction

        // Get blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = usersWallet;

        const serializedMessage = transaction.serializeMessage().toString('base64');

        return serializedMessage;
    } catch (error) {
        console.log(`Error creating transaction: ${error}`);
    }
}