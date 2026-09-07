# AEGIS Blockchain Ledger

This directory contains the independent smart-contract layer for AEGIS artifact integrity and provenance.

The contract stores only a cryptographic artifact fingerprint and minimal audit metadata. Confidential PDFs, images, reports, AI conversations, employee passwords, and other MRPL information remain off-chain.

## Commands

```powershell
npm install
npm run build
npm test
```

For a local JSON-RPC node:

```powershell
npx hardhat node
npm run deploy:local
```

Sepolia deployment requires a dedicated development wallet and a local `.env` containing `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY`. Never expose that private key through frontend environment variables or commit `.env`.

## Contract roles

- `DEFAULT_ADMIN_ROLE` can grant and revoke roles.
- `AUDITOR_ROLE` can append artifact provenance records.

The application approval workflow remains the source of approval decisions. The ledger only records the hash and action after an authorized actor signs the transaction.
