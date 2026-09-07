import hre from 'hardhat';

const { viem } = await hre.network.create();
const [deployer] = await viem.getWalletClients();

if (!deployer) {
  throw new Error('No deployer wallet is available for this network.');
}

const ledger = await viem.deployContract('AuditLedger', [deployer.account.address]);

console.log(`AuditLedger deployed at: ${ledger.address}`);
console.log(`Deployer / initial auditor: ${deployer.account.address}`);
