import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { formatFileSize, formatRelativeTime } from '@/lib/utils';
import { mockDocuments } from '@/data/mock-data';
import { documentService } from '@/services/documents';
import type { Classification } from '@/types/document';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { HashValue } from '@/components/ui/HashValue';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ocrSearch, setOcrSearch] = useState('');
  const [doc, setDoc] = useState(mockDocuments[0]);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!id) return;
    void documentService.get(id).then((loaded) => { if (loaded) setDoc(loaded); }).catch(() => undefined);
  }, [id]);

  const downloadDocument = async () => {
    if (!doc.downloadUrl) {
      setDownloadError('This document has no downloadable file attached.');
      return;
    }
    try {
      const response = await fetch(doc.downloadUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem('aegis_access_token') || ''}` },
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(url);
      setDownloadError('');
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : 'Download failed.');
    }
  };

  const getClassificationBadge = (cls: Classification) => {
    switch (cls) {
      case 'RESTRICTED':
        return <Badge variant="danger">RESTRICTED</Badge>;
      case 'CONFIDENTIAL':
        return <Badge variant="warning">CONFIDENTIAL</Badge>;
      default:
        return <Badge variant="default">INTERNAL</Badge>;
    }
  };

  const sampleOcrText = `
SECTION 4.2: CORROSION INSPECTION & ULTRASONIC TESTING
EQUIPMENT TAG: V-104-CDU | REFINERY UNIT 4
INSPECTION DATE: 2026-08-14 | INSPECTOR ID: INSP-8821

1. SCOPE & METHODOLOGY
Ultrasonic wall thickness measurement conducted at 12 grid points across the lower shell courses of Atmospheric Column V-104. Calibration performed using 5-step carbon steel reference block.

2. OBSERVATIONS & RECORDED THICKNESSES
- Point 1 (North 0°): 6.8 mm (Design Nominal: 8.0 mm)
- Point 2 (East 90°): 6.5 mm
- Point 3 (South 180°): 4.2 mm [CRITICAL: Below minimum allowable retirement thickness of 5.0 mm per OISD-105 Section 6.2]
- Point 4 (West 270°): 6.7 mm

3. CONCLUSION & MANDATORY ACTIONS
Immediate derating or plate doubler repair required prior to turnaround closure. Operational temperature must not exceed 320°C in lower tray section.
  `.trim();

  const filteredOcrText = useMemo(() => {
    if (!ocrSearch.trim()) return sampleOcrText;
    return sampleOcrText
      .split('\n')
      .filter((line) => line.toLowerCase().includes(ocrSearch.toLowerCase()))
      .join('\n');
  }, [ocrSearch, sampleOcrText]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        to="/documents"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Documents</span>
      </Link>

      <PageHeader
        title={doc.name}
        description={`Classified document ${doc.id} · Ingested ${formatRelativeTime(doc.uploadedAt)}`}
        badge={getClassificationBadge(doc.classification)}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => void downloadDocument()}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/workspace?prompt=${encodeURIComponent(`Analyze document ${doc.name} for compliance and anomalies.`)}`)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analyze in AI Workspace</span>
            </Button>
          </div>
        }
      />
      {downloadError && <div className="text-xs text-status-danger">{downloadError}</div>}

      {/* Tabs Layout */}
      <Tabs
        tabs={[
          {
            key: 'overview',
            label: 'Overview & Metadata',
            content: (
              <div className="space-y-6 pt-2">
                <Card padding="md">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-text-dim block mb-1">Department</span>
                      <span className="text-text-primary font-medium">{doc.department}</span>
                    </div>
                    <div>
                      <span className="text-text-dim block mb-1">File Format</span>
                      <span className="text-text-primary font-mono uppercase">{doc.type}</span>
                    </div>
                    <div>
                      <span className="text-text-dim block mb-1">File Size</span>
                      <span className="text-text-primary font-mono">{formatFileSize(doc.size)}</span>
                    </div>
                    <div>
                      <span className="text-text-dim block mb-1">Page Count</span>
                      <span className="text-text-primary font-mono">{doc.pages || 1} pages</span>
                    </div>
                  </div>
                </Card>

                <Card padding="md" className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                    Document Cryptographic Identity
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border-subtle">
                      <span className="text-text-muted">SHA-256 Digest</span>
                      <HashValue hash={doc.hash || '0xa3f8c2d1e9b47f3a6c8d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1'} length={12} />
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border-subtle">
                      <span className="text-text-muted">Vault Storage Path</span>
                      <span className="font-mono text-text-secondary">/vault/classified/oil_gas/{doc.id}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-text-muted">Indexing Status</span>
                      <Badge variant="success">Fully Vectorized & Indexed</Badge>
                    </div>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'analysis',
            label: 'AI Synthesis & Compliance',
            content: (
              <div className="space-y-4 pt-2 text-xs">
                <Card padding="md" className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <span className="font-medium text-text-primary">Executive Summary</span>
                    <Badge variant="outline" className="font-mono text-[10px]">Mistral-7B Local</Badge>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    This document outlines non-destructive ultrasonic testing for Column V-104. While average wall thickness conforms to operating standards, location Point 3 shows accelerated thinning to 4.2mm, breaching mandatory threshold limits under OISD-105.
                  </p>
                </Card>

                <Card padding="md" className="space-y-3">
                  <h3 className="text-xs font-semibold text-text-primary">Key Compliance Flags</h3>
                  <div className="space-y-2">
                    <div className="p-3 rounded-md bg-status-danger/10 border border-status-danger/20 text-text-primary space-y-1">
                      <div className="font-medium text-status-danger flex items-center gap-1.5">
                        <span>CRITICAL: Wall Thickness Breach (Point 3)</span>
                      </div>
                      <p className="text-text-muted text-[11px]">
                        Measured 4.2mm vs 5.0mm minimum allowable limit. Mandatory remediation notice issued.
                      </p>
                    </div>

                    <div className="p-3 rounded-md bg-bg-subtle/50 border border-border-subtle text-text-primary space-y-1">
                      <div className="font-medium text-text-secondary flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
                        <span>Operating Temperature Conformance</span>
                      </div>
                      <p className="text-text-muted text-[11px]">
                        Thermal range (320°C) is below thermal degradation limit (350°C).
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'ocr',
            label: 'Extracted OCR Text',
            content: (
              <div className="space-y-3 pt-2 text-xs">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-dim" />
                  <input
                    type="text"
                    value={ocrSearch}
                    onChange={(e) => setOcrSearch(e.target.value)}
                    placeholder="Search extracted text..."
                    className="w-full rounded-md border border-border-default bg-bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none"
                  />
                </div>

                <Card padding="md" className="bg-bg-primary font-mono text-[11px] leading-relaxed text-text-muted whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {filteredOcrText}
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
