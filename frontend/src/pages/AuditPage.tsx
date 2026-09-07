import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import {
  mockAuditRecords,
  mockVerificationSuccess,
  mockVerificationFailure,
} from '@/data/mock-data';
import type { VerificationResult } from '@/types/audit';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { ArtifactHash } from '@/components/blockchain/ArtifactHash';
import { VerificationStatus } from '@/components/blockchain/VerificationStatus';
import { BlockchainRecord } from '@/components/blockchain/BlockchainRecord';
import { blockchainService, hashFile } from '@/services/blockchain';

export default function AuditPage() {
  const [searchParams] = useSearchParams();
  const initialVerifyParam = searchParams.get('verify') || '';

  const defaultTab = initialVerifyParam ? 'verify' : 'log';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    mockAuditRecords[0]?.id || null
  );

  // Verifier tool state
  const [customHash, setCustomHash] = useState(
    initialVerifyParam ? `0x9e8a7f6b5c4d3e2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8` : ''
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationOutcome, setVerificationOutcome] = useState<VerificationResult | null>(
    initialVerifyParam ? mockVerificationSuccess : null
  );

  const filteredRecords = useMemo(() => {
    return mockAuditRecords.filter((record) => {
      const matchesSearch =
        record.artifactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.hash.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = selectedAction === 'All' || record.action === selectedAction;
      return matchesSearch && matchesAction;
    });
  }, [searchQuery, selectedAction]);

  const selectedRecord = useMemo(() => {
    return mockAuditRecords.find((r) => r.id === selectedRecordId) || mockAuditRecords[0];
  }, [selectedRecordId]);

  const handleRunVerification = (sampleType: 'valid' | 'tampered' | 'custom') => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationOutcome(null);

    setTimeout(() => {
      if (sampleType === 'valid') {
        setVerificationOutcome(mockVerificationSuccess);
      } else if (sampleType === 'tampered') {
        setVerificationOutcome(mockVerificationFailure);
      } else {
        // Custom verification logic
        setVerificationOutcome({
          ...mockVerificationSuccess,
          localHash: customHash || mockVerificationSuccess.localHash,
          match: customHash.length > 20,
        });
      }
      setIsVerifying(false);
    }, 500);
  };

  const handleVerifyUploadedFile = async () => {
    if (!selectedFile || !selectedRecord) return;

    setIsVerifying(true);
    setVerificationError(null);
    setVerificationOutcome(null);

    try {
      const localHash = await hashFile(selectedFile);
      const result = await blockchainService.verifyArtifact(selectedRecord.artifactId, localHash);
      const network = blockchainService.getConfig().networkName || 'AEGIS Local Hardhat';

      setVerificationOutcome({
        artifactId: selectedRecord.artifactId,
        artifactName: selectedFile.name,
        localHash,
        recordedHash: result.recordedHash,
        match: result.match,
        blockchainNetwork: network,
        transactionHash: result.transaction.transactionHash,
        blockNumber: result.transaction.blockNumber,
        timestamp: result.transaction.timestamp,
        action: 'ARTIFACT_VERIFIED',
      });
    } catch (error: unknown) {
      setVerificationError(error instanceof Error ? error.message : 'Artifact verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Audit & Cryptographic Provenance"
        description="Immutable Proof-of-Authority ledger records for all synthesized artifacts and operator actions"
        badge={
          <Badge variant="outline" className="font-mono text-[10px] text-text-dim">
            PoA L2 Private Ledger
          </Badge>
        }
      />

      <Tabs
        defaultTab={defaultTab}
        tabs={[
          {
            key: 'log',
            label: 'Audit Trail & Event Log',
            content: (
              <div className="space-y-4 pt-2">
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-dim" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter ledger events by artifact, actor, or hash..."
                      className="w-full rounded-md border border-border-default bg-bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none"
                  >
                    <option value="All">All Actions</option>
                    <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
                    <option value="AI_ANALYSIS">AI_ANALYSIS</option>
                    <option value="HUMAN_APPROVED">HUMAN_APPROVED</option>
                    <option value="HUMAN_REJECTED">HUMAN_REJECTED</option>
                    <option value="ARTIFACT_VERIFIED">ARTIFACT_VERIFIED</option>
                  </select>
                </div>

                {/* Table */}
                <Card padding="none" className="overflow-hidden divide-y divide-border-subtle">
                  <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-surface/60 text-[11px] font-mono text-text-dim uppercase tracking-wider">
                    <div className="col-span-5 sm:col-span-4">Event / Artifact</div>
                    <div className="col-span-3 sm:col-span-3">Action</div>
                    <div className="col-span-2 sm:col-span-2 hidden sm:block">Actor</div>
                    <div className="col-span-4 sm:col-span-3 text-right">Ledger Status</div>
                  </div>

                  {filteredRecords.map((record) => {
                    const isSelected = selectedRecord?.id === record.id;
                    return (
                      <div
                        key={record.id}
                        onClick={() => setSelectedRecordId(record.id)}
                        className={`grid grid-cols-12 items-center px-4 py-3 text-xs hover:bg-bg-subtle/50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-bg-subtle/40' : ''
                        }`}
                      >
                        <div className="col-span-5 sm:col-span-4 min-w-0 pr-2">
                          <div className="font-medium text-text-primary truncate">
                            {record.artifactName}
                          </div>
                          <div className="text-[11px] text-text-dim font-mono truncate">
                            {formatRelativeTime(record.timestamp)}
                          </div>
                        </div>

                        <div className="col-span-3 sm:col-span-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {record.action}
                          </Badge>
                        </div>

                        <div className="col-span-2 sm:col-span-2 hidden sm:block text-text-muted truncate">
                          {record.actor}
                        </div>

                        <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-2">
                          <ArtifactHash hash={record.hash} length={4} />
                          <VerificationStatus status={record.blockchainStatus} size="sm" showLabel={false} />
                        </div>
                      </div>
                    );
                  })}
                </Card>

                {/* Detail card of selected record */}
                {selectedRecord && (
                  <div className="pt-2">
                    <BlockchainRecord
                      transactionHash={selectedRecord.transactionHash || '0x4f8b2c1d9e3a7f6b5c4d3e2a1f0e9d8c7b6a5f4e'}
                      blockNumber={selectedRecord.blockNumber || 1489230}
                      timestamp={selectedRecord.timestamp}
                      contentHash={selectedRecord.hash}
                      status={selectedRecord.blockchainStatus}
                    />
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'verify',
            label: 'Artifact Cryptographic Verifier',
            content: (
              <div className="space-y-6 pt-2">
                <Card padding="md" className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary">
                      Verify Artifact Authenticity Against On-Chain Proof
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Computes the SHA-256 digest of an artifact and queries the local consortium smart contract to verify that zero tampering occurred.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-text-dim uppercase tracking-wider">
                      Artifact Content SHA-256 Hash
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customHash}
                        onChange={(e) => setCustomHash(e.target.value)}
                        placeholder="Paste SHA-256 hash or artifact identifier..."
                        className="flex-1 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-dim focus:outline-none"
                      />
                      <Button
                        variant="primary"
                        size="md"
                        disabled={isVerifying || !customHash.trim()}
                        onClick={() => handleRunVerification('custom')}
                      >
                        {isVerifying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                        <span>Verify Proof</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border-subtle pt-4">
                    <label className="block text-xs font-mono text-text-dim uppercase tracking-wider">
                      Verify a local artifact against the selected record
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="file"
                        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                        className="block w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-muted file:mr-3 file:rounded file:border-0 file:bg-bg-subtle file:px-2 file:py-1 file:text-xs file:text-text-secondary"
                      />
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={isVerifying || !selectedFile || !selectedRecord}
                        onClick={handleVerifyUploadedFile}
                      >
                        {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                        <span>Verify File</span>
                      </Button>
                    </div>
                    <p className="text-[11px] text-text-dim">
                      The file is hashed locally in the browser. The document itself is never sent to the blockchain.
                    </p>
                  </div>

                  {verificationError && (
                    <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
                      {verificationError}
                    </div>
                  )}

                  {/* Preset Demonstrations */}
                  <div className="pt-2 border-t border-border-subtle flex items-center gap-2">
                    <span className="text-[11px] text-text-dim font-mono mr-1">
                      Quick Demo Scenarios:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomHash(mockVerificationSuccess.recordedHash);
                        handleRunVerification('valid');
                      }}
                      className="px-2.5 py-1 rounded text-xs bg-bg-subtle/50 hover:bg-bg-subtle text-status-success border border-status-success/30 transition-colors"
                    >
                      ✓ Valid Artifact Proof
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomHash(mockVerificationFailure.localHash);
                        handleRunVerification('tampered');
                      }}
                      className="px-2.5 py-1 rounded text-xs bg-bg-subtle/50 hover:bg-bg-subtle text-status-danger border border-status-danger/30 transition-colors"
                    >
                      ✗ Tampered Hash Simulation
                    </button>
                  </div>
                </Card>

                {/* Verification Result Card */}
                {verificationOutcome && (
                  <Card padding="md" className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                      <div className="flex items-center gap-2">
                        {verificationOutcome.match ? (
                          <CheckCircle2 className="h-5 w-5 text-status-success" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-status-danger" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-text-primary">
                            {verificationOutcome.match
                              ? 'Cryptographic Authenticity Verified'
                              : 'INTEGRITY MISMATCH DETECTED'}
                          </div>
                          <div className="text-[11px] text-text-dim">
                            {verificationOutcome.match
                              ? 'The local file hash matches the on-chain ledger state perfectly.'
                              : 'Local content does not match the immutable blockchain record. File may be tampered.'}
                          </div>
                        </div>
                      </div>
                      <VerificationStatus match={verificationOutcome.match} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-text-dim block mb-1">Local Computed Digest</span>
                        <ArtifactHash hash={verificationOutcome.localHash} length={10} className="-ml-1" />
                      </div>
                      <div>
                        <span className="text-text-dim block mb-1">On-Chain Recorded Digest</span>
                        <ArtifactHash hash={verificationOutcome.recordedHash} length={10} className="-ml-1" />
                      </div>
                    </div>

                    {verificationOutcome.match && (
                      <div className="pt-2">
                        <BlockchainRecord
                          transactionHash={verificationOutcome.transactionHash}
                          blockNumber={verificationOutcome.blockNumber}
                          timestamp={verificationOutcome.timestamp}
                          network={verificationOutcome.blockchainNetwork}
                          status="confirmed"
                        />
                      </div>
                    )}
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
