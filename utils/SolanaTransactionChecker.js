import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { serviceRepo } from '@/services/ServiceRepository';
const connection = new Connection(clusterApiUrl('devnet'), "confirmed");

export async function verifyBetTransaction(signature) {
    const SITE_WALLET_ADDRESS = 'A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU';
  
    try {
      // 1. Fetch Parsed Transaction
      const tx = await connection.getParsedTransaction(signature, { commitment: "confirmed" });
  
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
          console.log("Extracted Nonce:", extractedNonce);
        } else if (instruction.programId.toBase58() === '11111111111111111111111111111111' && instruction.parsed?.type === 'transfer') {
          transferInstruction = instruction.parsed.info;
          console.log("Found Transfer:", transferInstruction);
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
      console.log("Destination Wallet Verified.");
  
      // 5. Match Nonce with Pending Bet (DB Query)
      const pendingBet = await findPendingBetByNonce(extractedNonce); // Implement this DB function
      if (!pendingBet) {
        throw new Error(`No matching pending bet found for nonce: ${extractedNonce}`);
      }
      console.log("Pending Bet Found:", pendingBet.id);
  
      // 6. Verify Amount
      const expectedLamports = Math.round(pendingBet.amount_to_add * LAMPORTS_PER_SOL); // Get expected amount from DB record
      if (transferInstruction.lamports !== expectedLamports) {
        throw new Error(`Incorrect amount transferred. Expected ${expectedLamports} lamports, got ${transferInstruction.lamports}`);
      }
      console.log("Amount Verified.");
  
      // 7. Verify Source (Recommended)
      const expectedSource = pendingBet.wallet_ca; // Get expected user wallet from DB record
      if (transferInstruction.source !== expectedSource) {
          // Decide how strict: log warning or throw error
          console.warn(`Transaction source ${transferInstruction.source} does not match expected user ${expectedSource} for bet ${pendingBet.id}.`);
          // Optionally: throw new Error("Transaction source does not match user.");
      } else {
          console.log("Source Wallet Verified.");
      }
  
  
    //   // All checks passed!
    //   console.log("Transaction verified successfully for bet:", pendingBet.id);
  
    //   // --> IMPORTANT: Update bet status in DB now to prevent reuse of nonce!
    //   await markBetAsPaid(pendingBet.id); // Implement this DB function
  
    //   return { success: true, betId: pendingBet.id, /* other details */ };

    // Send the signature + update the status 

    const pendingBetData = {
        ...pendingBet,
        signature: signature,
        status: 'complete'
    };

    // Updated the pending bet data
    await serviceRepo.pendingBetsService.updatePendingBetById(pendingBet.id, pendingBetData);

    // Create Bet
    await createBet(pendingBet);

    console.log('Bet successfully created.');

    return { success: true };
  
    } catch (error) {
      console.error("Payment verification failed:", error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Dummy DB functions - replace with your actual implementation
  async function findPendingBetByNonce(nonce) {
    try {
        const pendingBet = await serviceRepo.pendingBetsService.fetchPendingBetByNonce(nonce);
        return pendingBet;
    } catch (error) {
        console.log('Error fetching pending bet:' ,error);
        return null;
    }
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
        console.log(`Error placing bet: `,error);
     }
  }
 