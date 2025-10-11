import {
    address,
    appendTransactionMessageInstructions,
    assertIsTransactionWithinSizeLimit,
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    createTransactionMessage,
    devnet,
    getSignatureFromTransaction,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    addSignersToTransactionMessage,
    getProgramDerivedAddress,
    generateKeyPairSigner,
    getAddressEncoder
} from "@solana/kit";

import { getInitializeInstruction, getSubmitTsInstruction } from "./clients/js/src/generated/index";
import wallet from "./Turbin3_wallet.json";

const MPL_CORE_PROGRAM = address("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
const PROGRAM_ADDRESS = address("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM");
const SYSTEM_PROGRAM = address("11111111111111111111111111111111");
const COLLECTION = address("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2");

// Import keypair from wallet file
const keypair = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
console.log(`Your Turbin3 wallet address: ${keypair.address}`);

// Create devnet connection
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const rpcSubscriptions = createSolanaRpcSubscriptions(devnet('ws://api.devnet.solana.com'));

const addressEncoder = getAddressEncoder();

// Create the PDA for enrollment account
const accountSeeds = [Buffer.from("prereqs"), addressEncoder.encode(keypair.address)];
const [account, _bump] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: accountSeeds
});

console.log(`PDA account: ${account}`);

// Create the authority PDA - seeds are "collection" + collection address
const authoritySeeds = [Buffer.from("collection"), addressEncoder.encode(COLLECTION)];
const [authority, _authorityBump] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: authoritySeeds
});

console.log(`Authority PDA: ${authority}`);

// Generate mint keypair for the NFT
const mintKeyPair = await generateKeyPairSigner();

// ===== INITIALIZE TRANSACTION =====
console.log("\n=== Step 1: Initialize ===");

const initializeIx = getInitializeInstruction({
    github: "meowyx",
    user: keypair,
    account,
    systemProgram: SYSTEM_PROGRAM
});

// Fetch latest blockhash
let { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transactionMessageInit = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(keypair, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions([initializeIx], tx)
);

const signedTxInit = await signTransactionMessageWithSigners(transactionMessageInit);
assertIsTransactionWithinSizeLimit(signedTxInit);

const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

try {
    await sendAndConfirmTransaction(signedTxInit, { commitment: 'confirmed', skipPreflight: false });
    const signatureInit = getSignatureFromTransaction(signedTxInit);
    console.log(`✅ Initialize Success!`);
    console.log(`https://explorer.solana.com/tx/${signatureInit}?cluster=devnet`);
} catch (e) {
    console.error(`❌ Initialize failed: ${e}`);
    process.exit(1);
}

// ===== SUBMIT TS TRANSACTION =====
console.log("\n=== Step 2: Submit TS ===");

// Get fresh blockhash
({ value: latestBlockhash } = await rpc.getLatestBlockhash().send());

const submitIx = getSubmitTsInstruction({
    user: keypair,
    account,
    mint: mintKeyPair,
    collection: COLLECTION,
    authority,
    mplCoreProgram: MPL_CORE_PROGRAM,
    systemProgram: SYSTEM_PROGRAM
});

const transactionMessageSubmit = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(keypair, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions([submitIx], tx),
    tx => addSignersToTransactionMessage([mintKeyPair], tx)
);

const signedTxSubmit = await signTransactionMessageWithSigners(transactionMessageSubmit);
assertIsTransactionWithinSizeLimit(signedTxSubmit);

try {
    await sendAndConfirmTransaction(signedTxSubmit, { commitment: 'confirmed', skipPreflight: false });
    const signatureSubmit = getSignatureFromTransaction(signedTxSubmit);
    console.log(`✅ Submit Success! You've completed the Turbin3 prerequisites! 🎉`);
    console.log(`https://explorer.solana.com/tx/${signatureSubmit}?cluster=devnet`);
} catch (e) {
    console.error(`❌ Submit failed: ${e}`);
}
