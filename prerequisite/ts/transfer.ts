import {
    address,
    appendTransactionMessageInstructions,
    assertIsTransactionWithinSizeLimit,
    compileTransaction,
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    createTransactionMessage,
    devnet,
    getSignatureFromTransaction,
    lamports,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    type TransactionMessageBytesBase64
} from "@solana/kit";

import { getTransferSolInstruction } from "@solana-program/system";
import wallet from "./dev-wallet.json";

const LAMPORTS_PER_SOL = BigInt(1_000_000_000);
const keypair = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

// Your Turbin3 wallet address
const turbin3Wallet = address(<Wallet_address>);

// Create RPC connection
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const rpcSubscriptions = createSolanaRpcSubscriptions(devnet('ws://api.devnet.solana.com'));

// ===== STEP 1: Transfer 1 SOL =====
console.log("Step 1: Transferring 1 SOL to Turbin3 wallet...");

const transferInstruction = getTransferSolInstruction({
    source: keypair,
    destination: turbin3Wallet,
    amount: lamports(1n * LAMPORTS_PER_SOL)
});

let latestBlockhash = (await rpc.getLatestBlockhash().send()).value;

let transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(keypair, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions([transferInstruction], tx)
);

let signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
assertIsTransactionWithinSizeLimit(signedTransaction);

let sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

try {
    await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' });
    const signature = getSignatureFromTransaction(signedTransaction);
    console.log(`✅ Success! 1 SOL transferred.`);
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet\n`);
} catch (e) {
    console.error('Transfer failed:', e);
    process.exit(1);
}

// ===== STEP 2: Empty remaining balance =====
console.log("Step 2: Emptying remaining balance...");

// Get current balance
const { value: balance } = await rpc.getBalance(keypair.address).send();
console.log(`Current balance: ${balance} lamports`);

// Get fresh blockhash
latestBlockhash = (await rpc.getLatestBlockhash().send()).value;

// Build dummy transaction to calculate fee
const dummyTransferInstruction = getTransferSolInstruction({
    source: keypair,
    destination: turbin3Wallet,
    amount: lamports(0n)
});

const dummyTransactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(keypair, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions([dummyTransferInstruction], tx)
);

// Compile the dummy transaction to get message bytes
const compiledDummy = compileTransaction(dummyTransactionMessage);
const dummyMessageBase64 = Buffer.from(compiledDummy.messageBytes).toString('base64') as TransactionMessageBytesBase64;

// Calculate the transaction fee
const { value: fee } = await rpc.getFeeForMessage(dummyMessageBase64).send() || 0n;

if (fee === null) {
    throw new Error('Unable to calculate transaction fee');
}

console.log(`Transaction fee: ${fee} lamports`);

if (balance < fee) {
    throw new Error(`Insufficient balance. Balance: ${balance}, Fee: ${fee}`);
}

// Calculate exact amount to send (balance minus fee)
const sendAmount = balance - fee;
console.log(`Sending: ${sendAmount} lamports`);

// Create real transfer instruction
const finalTransferInstruction = getTransferSolInstruction({
    source: keypair,
    destination: turbin3Wallet,
    amount: lamports(sendAmount)
});

transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(keypair, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions([finalTransferInstruction], tx)
);

signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
assertIsTransactionWithinSizeLimit(signedTransaction);

sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

try {
    await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' });
    const signature = getSignatureFromTransaction(signedTransaction);
    console.log(`✅ Success! Wallet emptied completely.`);
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
} catch (e) {
    console.error('Transfer failed:', e);
}
