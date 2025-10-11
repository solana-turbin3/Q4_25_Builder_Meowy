#[cfg(test)]
mod tests {
    use solana_client::rpc_client::RpcClient;
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::{Keypair, Signer, read_keypair_file},
        transaction::Transaction,
    };
    use solana_system_interface::program as system_program;
    use std::str::FromStr;

    const RPC_URL: &str =
        "https://turbine-solanad-4cde.devnet.rpcpool.com/9a9da9cf-6db1-47dc-839a-55aca5c9c80a";

    #[test]
    fn submit_turbin3() {
        // Load your Turbin3 keypair (same one from TypeScript)
        let signer = read_keypair_file("Turbin3-wallet.json").expect("Couldn't find wallet file");

        println!("Using wallet: {}", signer.pubkey());

        // Create a Solana RPC client
        let rpc_client = RpcClient::new(RPC_URL);

        // Define program and account public keys
        let mint = Keypair::new();
        let turbin3_prereq_program =
            Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap();
        let collection = Pubkey::from_str("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2").unwrap();
        let mpl_core_program =
            Pubkey::from_str("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d").unwrap();
        let system_program = system_program::id();

        // Get the PDA (Program Derived Address) - same as TypeScript
        let signer_pubkey = signer.pubkey();
        let seeds = &[b"prereqs" as &[u8], signer_pubkey.as_ref()];
        let (prereq_pda, _bump) = Pubkey::find_program_address(seeds, &turbin3_prereq_program);

        println!("PDA account: {}", prereq_pda);

        // Get authority PDA - IMPORTANT: seeds are "collection" + collection address (like TypeScript)
        let (authority, _auth_bump) = Pubkey::find_program_address(
            &[b"collection", collection.as_ref()],
            &turbin3_prereq_program,
        );

        println!("Authority PDA: {}", authority);

        // Prepare the instruction data (discriminator for submit_rs)
        let data = vec![77, 124, 82, 163, 21, 133, 181, 206];

        // Define the accounts metadata
        let accounts = vec![
            AccountMeta::new(signer.pubkey(), true),     // user signer
            AccountMeta::new(prereq_pda, false),         // PDA account
            AccountMeta::new(mint.pubkey(), true),       // mint keypair
            AccountMeta::new(collection, false),         // collection
            AccountMeta::new_readonly(authority, false), // authority (PDA)
            AccountMeta::new_readonly(mpl_core_program, false), // mpl core program
            AccountMeta::new_readonly(system_program, false), // system program
        ];

        // Get the recent blockhash
        let blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");

        // Build the instruction
        let instruction = Instruction {
            program_id: turbin3_prereq_program,
            accounts,
            data,
        };

        // Create and sign the transaction
        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&signer.pubkey()),
            &[&signer, &mint],
            blockhash,
        );

        // Send and confirm the transaction
        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");

        println!(
            "Success! Check out your TX here:\nhttps://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );
    }
}
