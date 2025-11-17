# SolArena

> A decentralized, gas-free contest platform built on Solana

## 🚀 Live Deployment

**Network:** Solana Devnet
**Program ID:** `9VcxDiDi8kbP6UnaVocXDcSPDwoJiDMxmECdqyALGuA4`
**Explorer:** [View on Solana Explorer](https://explorer.solana.com/address/9VcxDiDi8kbP6UnaVocXDcSPDwoJiDMxmECdqyALGuA4?cluster=devnet)
**Live Website:** [solana-contest-platform.vercel.app](https://solana-contest-platform.vercel.app/)
**GitHub Repository:** [github.com/meowyx/solana-contest-platform](https://github.com/meowyx/solana-contest-platform)

## Overview

SolArena is a decentralized contest and bounty platform that enables organizations to launch competitions with built-in escrow, multisig judging, and optional transaction fee sponsorship. Participants can submit entries without needing SOL for gas fees.

## Core Features

- **SOL-Based Prizes** - Direct SOL prize amounts with transparent escrow
- **Built-in Escrow** - Automatic fund locking using PDAs
- **Multisig Judging** - Configurable judge panel with customizable approval threshold
- **Gas Sponsorship** - Optional fee sponsorship for barrier-free participation
- **Submission Management** - URL-based submissions with update capability

## Quick Start

```bash
# Install dependencies
yarn install

# Build the program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Use Cases

- Hackathons and coding competitions
- Bounty programs for development work
- Design contests and content creation
- Community challenges
- Bug bounties

## Technical Stack

- **Framework:** Anchor 0.32.1
- **Language:** Rust
- **Platform:** Solana
- **Frontend:** Next.js 16 with App Router
