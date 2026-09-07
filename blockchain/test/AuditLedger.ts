import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import { keccak256, stringToBytes, toHex } from 'viem';

const { viem } = await hre.network.create();

const recordId = keccak256(stringToBytes('INS-001:APPROVED'));
const artifactHash = keccak256(stringToBytes('sha256:inspection-report-v1'));
const previousHash = keccak256(stringToBytes('INS-001:GENERATED'));

async function deployLedger() {
  const [deployer] = await viem.getWalletClients();
  return viem.deployContract('AuditLedger', [deployer.account.address]);
}

describe('AuditLedger', () => {
  it('grants admin and auditor roles to the deployer', async () => {
    const ledger = await deployLedger();
    const [deployer] = await viem.getWalletClients();

    assert.equal(await ledger.read.hasRole([await ledger.read.DEFAULT_ADMIN_ROLE(), deployer.account.address]), true);
    assert.equal(await ledger.read.hasRole([await ledger.read.AUDITOR_ROLE(), deployer.account.address]), true);
  });

  it('records and retrieves an artifact provenance entry', async () => {
    const ledger = await deployLedger();
    const [deployer] = await viem.getWalletClients();

    await ledger.write.recordArtifact([recordId, artifactHash, previousHash, 'APPROVED']);
    const record = await ledger.read.getRecord([recordId]);

    assert.equal(record.artifactHash, artifactHash);
    assert.equal(record.previousHash, previousHash);
    assert.equal(record.action, 'APPROVED');
    assert.equal(record.actor.toLowerCase(), deployer.account.address.toLowerCase());
    assert.equal(record.exists, true);
    assert.equal(await ledger.read.verifyArtifact([recordId, artifactHash]), true);
    assert.equal(await ledger.read.verifyArtifact([recordId, keccak256(stringToBytes('tampered'))]), false);
  });

  it('rejects duplicate record IDs', async () => {
    const ledger = await deployLedger();
    await ledger.write.recordArtifact([recordId, artifactHash, previousHash, 'APPROVED']);

    await assert.rejects(
      ledger.write.recordArtifact([recordId, artifactHash, previousHash, 'APPROVED']),
      /RecordAlreadyExists|reverted/,
    );
  });

  it('rejects writes from an account without AUDITOR_ROLE', async () => {
    const ledger = await deployLedger();
    const [_, nonAuditor] = await viem.getWalletClients();
    const unauthorized = ledger.write.recordArtifact(
      [recordId, artifactHash, previousHash, 'APPROVED'],
      { account: nonAuditor.account },
    );

    await assert.rejects(unauthorized, /AccessControlUnauthorizedAccount|reverted/);
  });

  it('allows the default admin to manage auditors', async () => {
    const ledger = await deployLedger();
    const [_, auditor] = await viem.getWalletClients();
    const auditorRole = await ledger.read.AUDITOR_ROLE();

    await ledger.write.grantRole([auditorRole, auditor.account.address]);
    assert.equal(await ledger.read.hasRole([auditorRole, auditor.account.address]), true);

    await ledger.write.revokeRole([auditorRole, auditor.account.address]);
    assert.equal(await ledger.read.hasRole([auditorRole, auditor.account.address]), false);
  });

  it('keeps an unknown record verifiable as false', async () => {
    const ledger = await deployLedger();
    const unknownId = toHex('unknown-record', { size: 32 });

    assert.equal(await ledger.read.verifyArtifact([unknownId, artifactHash]), false);
    await assert.rejects(ledger.read.getRecord([unknownId]), /RecordNotFound|reverted/);
  });
});
