import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from 'viem';
import type { ArtifactRecord, BlockchainConfig, BlockchainTransaction } from '@/types/blockchain';
import { auditLedgerAbi } from '@/services/auditLedgerAbi';

/** Real AuditLedger boundary with an intentional mock fallback before deployment. */
const configuredAddress = import.meta.env.VITE_AEGIS_AUDIT_LEDGER_ADDRESS as Address | undefined;
const configuredRpcUrl = import.meta.env.VITE_AEGIS_RPC_URL as string | undefined;
const configuredChainId = Number(import.meta.env.VITE_AEGIS_CHAIN_ID || 31337);

const config: BlockchainConfig = {
  contractAddress: configuredAddress,
  abi: auditLedgerAbi as unknown as unknown[],
  rpcUrl: configuredRpcUrl,
  chainId: configuredChainId,
  networkName: import.meta.env.VITE_AEGIS_NETWORK_NAME || 'AEGIS Local Hardhat',
};

const zeroHash = `0x${'0'.repeat(64)}` as Hex;
const chain = defineChain({
  id: config.chainId || 31337,
  name: config.networkName || 'AEGIS Local Hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl || 'http://127.0.0.1:8545'] } },
});

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereumProvider(): EthereumProvider {
  const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!provider) throw new Error('MetaMask is not available.');
  return provider;
}

function requireConfigured(): BlockchainConfig & { contractAddress: Address; rpcUrl: string } {
  if (!config.contractAddress) throw new Error('AuditLedger is not configured. Set VITE_AEGIS_AUDIT_LEDGER_ADDRESS.');
  if (!config.rpcUrl) throw new Error('Blockchain RPC is not configured. Set VITE_AEGIS_RPC_URL.');
  return config as BlockchainConfig & { contractAddress: Address; rpcUrl: string };
}

function isConfigured(): boolean {
  return Boolean(config.contractAddress && config.rpcUrl);
}

function getPublicClient() {
  const configured = requireConfigured();
  return createPublicClient({ chain, transport: http(configured.rpcUrl) });
}

function toRecordId(artifactId: string): Hex {
  return keccak256(stringToBytes(artifactId));
}

function transactionFromReceipt(
  transactionHash: Hex,
  blockNumber: bigint,
  timestamp = new Date().toISOString(),
): BlockchainTransaction {
  return { transactionHash, blockNumber: Number(blockNumber), timestamp, status: 'confirmed' };
}

export async function hashFile(file: File): Promise<Hex> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}` as Hex;
}

export async function connectWallet(): Promise<Address> {
  requireConfigured();
  const walletClient = createWalletClient({ chain, transport: custom(getEthereumProvider()) });
  const [account] = await walletClient.requestAddresses();
  if (!account) throw new Error('No wallet account was returned by MetaMask.');
  return account;
}

export const blockchainService = {
  getConfig(): BlockchainConfig {
    return { ...config };
  },

  isConfigured,

  async recordArtifact(record: ArtifactRecord): Promise<BlockchainTransaction> {
    if (!isConfigured()) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return transactionFromReceipt(
        `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as Hex,
        BigInt(18234567 + Math.floor(Math.random() * 100)),
      );
    }

    const configured = requireConfigured();
    const account = await connectWallet();
    const walletClient = createWalletClient({ chain, transport: custom(getEthereumProvider()) });
    const transactionHash = await walletClient.writeContract({
      address: configured.contractAddress,
      abi: auditLedgerAbi,
      functionName: 'recordArtifact',
      args: [toRecordId(record.artifactId), record.contentHash, zeroHash, record.eventType],
      account,
    });
    const receipt = await getPublicClient().waitForTransactionReceipt({ hash: transactionHash });
    return transactionFromReceipt(transactionHash, receipt.blockNumber);
  },

  async verifyArtifact(
    artifactId: string,
    localHash: Hex,
  ): Promise<{ match: boolean; recordedHash: Hex; transaction: BlockchainTransaction }> {
    if (!isConfigured()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const match = artifactId === 'art-001' || artifactId === 'doc-001';
      return {
        match,
        recordedHash: match
          ? localHash
          : `0x${'ff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'}` as Hex,
        transaction: transactionFromReceipt(
          `0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8` as Hex,
          BigInt(18234567),
          '2026-09-01T09:00:00Z',
        ),
      };
    }

    const configured = requireConfigured();
    const publicClient = getPublicClient();
    const recordId = toRecordId(artifactId);
    const stored = await publicClient.readContract({
      address: configured.contractAddress,
      abi: auditLedgerAbi,
      functionName: 'getRecord',
      args: [recordId],
    });
    const matched = await publicClient.readContract({
      address: configured.contractAddress,
      abi: auditLedgerAbi,
      functionName: 'verifyArtifact',
      args: [recordId, localHash],
    });
    return {
      match: matched,
      recordedHash: stored.artifactHash,
      transaction: {
        timestamp: new Date(Number(stored.timestamp) * 1000).toISOString(),
        status: 'confirmed',
      },
    };
  },

  async getTransactionHistory(fromBlock?: number): Promise<BlockchainTransaction[]> {
    void fromBlock;
    if (!isConfigured()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [
        transactionFromReceipt(
          `0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8` as Hex,
          BigInt(18234567),
          '2026-09-01T09:00:00Z',
        ),
        transactionFromReceipt(
          `0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9` as Hex,
          BigInt(18234568),
          '2026-09-01T09:15:00Z',
        ),
      ];
    }
    return [];
  },
};
