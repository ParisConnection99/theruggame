import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { serviceRepo } from '@/services/ServiceRepository';

const connection = new Connection(clusterApiUrl('devnet'), "confirmed", {
  confirmTransactionInitialTimeout: 60000, // 60 seconds
});

// Helper function to get transaction with retries
async function getTransactionWithRetry(signature, maxRetries = 5) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`Attempt ${retries + 1} to fetch transaction ${signature}`);
      const tx = await connection.getParsedTransaction(signature, {
        commitment: "confirmed"
      });

      if (tx) return tx;

      // If tx is null but no error was thrown, wait and retry
      const delay = 1000 * Math.pow(2, retries); // Exponential backoff
      console.log(`Transaction not found yet, retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, error);
      const delay = 1000 * Math.pow(2, retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }

  throw new Error(`Failed to get transaction after ${maxRetries} attempts`);
}

export async function verifyBetTransaction(signature) {
  const SITE_WALLET_ADDRESS = 'A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU';

  try {
    // 1. Fetch Parsed Transaction
    const tx = await getTransactionWithRetry(signature);

    // 1a. Check Existence and Success
    if (!tx) {
      throw new Error(`Transaction not found for signature: ${signature}`);
    }
    if (tx.meta.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`);
    }

    let extractedNonce = null;
    let transferInstruction = null;

    // 2 & 3. Find Memo and Transfer Instructions
    for (const instruction of tx.transaction.message.instructions) {
      if (instruction.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' && typeof instruction.parsed === 'string') {
        extractedNonce = instruction.parsed; // Assuming simple string memo
      } else if (instruction.programId.toBase58() === '11111111111111111111111111111111' && instruction.parsed?.type === 'transfer') {
        transferInstruction = instruction.parsed.info;
      }
    }

    // 2a & 3a. Check Instructions Found
    if (!extractedNonce) {
      throw new Error("Memo instruction (nonce) not found in transaction.");
    }
    if (!transferInstruction) {
      throw new Error("SOL transfer instruction not found in transaction.");
    }

    // 4. Verify Destination
    if (transferInstruction.destination !== SITE_WALLET_ADDRESS) {
      throw new Error(`Incorrect destination wallet. Expected ${SITE_WALLET_ADDRESS}, got ${transferInstruction.destination}`);
    }

    // 5. Match Nonce with Pending Bet (DB Query)
    const pendingBet = await findPendingBetByNonce(extractedNonce); // Implement this DB function
    if (!pendingBet) {
      throw new Error(`No matching pending bet found for nonce: ${extractedNonce}`);
    }

    // 6. Verify Amount
    const expectedLamports = Math.round(pendingBet.amount_to_add * LAMPORTS_PER_SOL); // Get expected amount from DB record
    if (transferInstruction.lamports !== expectedLamports) {
      throw new Error(`Incorrect amount transferred. Expected ${expectedLamports} lamports, got ${transferInstruction.lamports}`);
    }

    // 7. Verify Source (Recommended)
    const expectedSource = pendingBet.wallet_ca; // Get expected user wallet from DB record
    if (transferInstruction.source !== expectedSource) {
      throw new Error("Transaction source does not match user.");
    }

    const pendingBetData = {
      ...pendingBet,
      signature: signature,
      status: 'complete'
    };

    // Updated the activity log - transfer checks complete
    await serviceRepo.activityLogService.logActivity({
      user_id: pendingBetData.user_id,
      action_type: 'transfer_check_completed',
      device_info: "",
      ip: "",
      additional_metadata: ""
    });

    await updatePendingBets(pendingBet.id, pendingBetData);
    await createBetAndLog(pendingBet, pendingBetData.user_id);

    return { success: true };

  } catch (error) {
    console.error("Payment verification failed:", error.message);
    return { success: false, error: error.message };
  }
}

async function createBetAndLog(pendingBet, userId) {
  await createBetWithRetry(pendingBet, 3);

  await serviceRepo.activityLogService.logActivity({
    user_id: userId,
    action_type: 'bet_added_successfully',
    device_info: "",
    ip: "",
    additional_metadata: ""
  });
}

async function updatePendingBets(pendingBetId, pendingBetData) {
  await serviceRepo.pendingBetsService.updatePendingBetById(pendingBetId, pendingBetData);

  await serviceRepo.activityLogService.logActivity({
    user_id: pendingBetData.user_id,
    action_type: 'pending_bet_update',
    device_info: "",
    ip: "",
    additional_metadata: ""
  });
}

async function findPendingBetByNonce(nonce) {
  try {
    const pendingBet = await serviceRepo.pendingBetsService.fetchPendingBetByNonce(nonce);
    return pendingBet;
  } catch (error) {
    console.log('Error fetching pending bet:', error);
    return null;
  }
}

async function createBetWithRetry(pendingBet, maxRetries = 3) {
   let retries = 0;

   while (retries < maxRetries) {
    try {
      const betData = {
        userId: pendingBet.user_id,
        amount: pendingBet.amount,
        betType: pendingBet.bet_type,
        token_name: pendingBet.token_name
      };
  
      await serviceRepo.bettingService
        .placeBetFromTransfer(
          pendingBet.market_id,
          betData,
          pendingBet.amount_to_add
        );

      return;
    } catch (error) {
      const delay = 300;
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
      // Logging the error
    }
   } 

   throw new Error(`Failed to create Bet after ${maxRetries} attempts.`);
}

async function createBet(pendingBet) {
  try {
    const betData = {
      userId: pendingBet.user_id,
      amount: pendingBet.amount,
      betType: pendingBet.bet_type,
      token_name: pendingBet.token_name
    };

    await serviceRepo.bettingService
      .placeBetFromTransfer(
        pendingBet.market_id,
        betData,
        pendingBet.amount_to_add
      );
  } catch (error) {
    console.log(`Error placing bet: `, error);
    // Logging the error
  }
}
