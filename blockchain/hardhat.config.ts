import { defineConfig } from 'hardhat/config';
import hardhatViem from '@nomicfoundation/hardhat-viem';
import hardhatViemAssertions from '@nomicfoundation/hardhat-viem-assertions';
import hardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner';
import hardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';

const sepoliaUrl = process.env.SEPOLIA_RPC_URL;
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

export default defineConfig({
  plugins: [
    hardhatViem,
    hardhatViemAssertions,
    hardhatNodeTestRunner,
    hardhatNetworkHelpers,
  ],
  solidity: {
    profiles: {
      default: {
        version: '0.8.28',
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks: sepoliaUrl && deployerPrivateKey
    ? {
        sepolia: {
          type: 'http',
          chainType: 'l1',
          url: sepoliaUrl,
          accounts: [deployerPrivateKey],
        },
      }
    : {},
});
