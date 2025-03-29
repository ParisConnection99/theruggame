import { Connection, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(clusterApiUrl('devnet'), "confirmed");
const SITE_WALLET_ADDRESS = 'A4nnzkNwsmW9SKh2m5a69vsqXmj18KoRMv1nXhiLGruU';

export async function verifyTransaction(signature) {
    console.log(`Signature: ${signature}`);

    const tx = await connection.getParsedTransaction(signature, { commitment: "confirmed" });
  
    if (!tx) throw new Error("Transaction not found");
  
    const sender = tx.transaction.message.accountKeys[0].pubkey.toString();
    const receiver = tx.transaction.message.instructions[0].parsed.info.destination;
    const amount = tx.transaction.message.instructions[0].parsed.info.lamports / 1_000_000_000;


    console.log(`Sender: ${sender}, Receiver: ${receiver}, Amount: ${amount} SOL`);

    const memo = await getMemoFromSignature(signature);

    console.log(`Memo: ${memo}`);
    
    // use memo to fetch pending bet
  }

  export async function getMemoFromSignature(signature) {
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
    });
  
    if (!transaction) {
      console.log("Transaction not found");
      return null;
    }
  
    // Look for Memo Program instructions
    for (const instruction of transaction.transaction.message.instructions) {
      if (instruction.programId.toString() === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") {
        console.log("Memo Found:", instruction.parsed);
        return instruction.parsed;
      }
    }
  
    console.log("No Memo Found in Transaction");
    return null;
  }