import { Connection, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(clusterApiUrl('devnet'), "confirmed");
import { serviceRepo } from '@/services/ServiceRepository';
const SITE_WALLET_ADDRESS = 'A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU';

// export async function verifyTransaction(signature) {
//     console.log(`Signature: ${signature}`);

//     const tx = await connection.getParsedTransaction(signature, { commitment: "confirmed" });
  
//     if (!tx) throw new Error("Transaction not found");

//     if (tx.meta.err) throw new Error('Error found.');

//     console.log('Parsed transaction: ', tx);
  
//     // const sender = tx.transaction.message.accountKeys[0].pubkey.toString();
//     // const receiver = tx.transaction.message.instructions[0].parsed.info.destination;
//     // const amount = tx.transaction.message.instructions[0].parsed.info.lamports / 1_000_000_000;

//     // console.log(`Sender: ${sender}, Receiver: ${receiver}, Amount: ${amount} SOL`);

//     const memo = await getMemoFromSignature(signature);

//     console.log(`Memo: ${memo}`);
    
//     // use memo to fetch pending bet
//   }

//   export async function getMemoFromSignature(signature) {
//     const transaction = await connection.getParsedTransaction(signature, {
//       commitment: "confirmed",
//     });
  
//     if (!transaction) {
//       console.log("Transaction not found");
//       return null;
//     }
  
//     // Look for Memo Program instructions
//     for (const instruction of transaction.transaction.message.instructions) {
//       if (instruction.programId.toString() === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") {
//         console.log("Memo Found:", instruction.parsed);
//         return instruction.parsed;
//       }
//     }
  
//     console.log("No Memo Found in Transaction");
//     return null;
//   }

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
  
    //   // 6. Verify Amount
    //   const expectedLamports = pendingBet.amount_lamports; // Get expected amount from DB record
    //   if (transferInstruction.lamports !== expectedLamports) {
    //     throw new Error(`Incorrect amount transferred. Expected ${expectedLamports} lamports, got ${transferInstruction.lamports}`);
    //   }
    //   console.log("Amount Verified.");
  
    //   // 7. Verify Source (Recommended)
    //   const expectedSource = pendingBet.user_wallet_address; // Get expected user wallet from DB record
    //   if (transferInstruction.source !== expectedSource) {
    //       // Decide how strict: log warning or throw error
    //       console.warn(`Transaction source ${transferInstruction.source} does not match expected user ${expectedSource} for bet ${pendingBet.id}.`);
    //       // Optionally: throw new Error("Transaction source does not match user.");
    //   } else {
    //       console.log("Source Wallet Verified.");
    //   }
  
  
    //   // All checks passed!
    //   console.log("Transaction verified successfully for bet:", pendingBet.id);
  
    //   // --> IMPORTANT: Update bet status in DB now to prevent reuse of nonce!
    //   await markBetAsPaid(pendingBet.id); // Implement this DB function
  
    //   return { success: true, betId: pendingBet.id, /* other details */ };
  
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
  
  async function markBetAsPaid(betId) {
    // Update your database: UPDATE pending_bets SET status = 'paid' WHERE id = ?
    console.log(`DB Update: Marking bet ${betId} as paid.`);
    // Replace with actual DB call
  }