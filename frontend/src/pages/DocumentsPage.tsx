import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Upload,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { formatFileSize, formatRelativeTime } from '@/lib/utils';
import type { Classification, Document } from '@/types/document';
import { documentService } from '@/services/documents';
import { DEPARTMENTS, CLASSIFICATIONS } from '@/lib/constants';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedClassification, setSelectedClassification] = useState<string>('All');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    void documentService.list().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDept === 'All' || doc.department === selectedDept;
      const matchesClass = selectedClassification === 'All' || doc.classification === selectedClassification;
      return matchesSearch && matchesDept && matchesClass;
    });
  }, [documents, searchQuery, selectedDept, selectedClassification]);

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

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await documentService.upload(selectedFile);
      setDocuments(await documentService.list());
      setSelectedFile(null);
      setUploadModalOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Classified Documents"
        description="Encrypted on-premises document repository"
        badge={
          <Badge variant="outline" className="font-mono text-[10px] text-text-dim">
            {documents.length} Documents Secured
          </Badge>
        }
        actions={
          <Button variant="primary" size="sm" onClick={() => setUploadModalOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            <span>Ingest Document</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-dim" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by filename, standard, or department..."
            className="w-full rounded-md border border-border-default bg-bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:border-border-hover focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-xs text-text-secondary focus:border-border-hover focus:outline-none"
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
            className="rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-xs text-text-secondary focus:border-border-hover focus:outline-none"
          >
            <option value="All">All Classifications</option>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document List */}
      <Card padding="none" className="overflow-hidden divide-y divide-border-subtle">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-surface/60 text-[11px] font-mono text-text-dim uppercase tracking-wider">
          <div className="col-span-5 sm:col-span-5">Document Name</div>
          <div className="col-span-2 sm:col-span-2">Classification</div>
          <div className="col-span-2 sm:col-span-2 hidden sm:block">Department</div>
          <div className="col-span-2 sm:col-span-2 hidden sm:block">Size · Pages</div>
          <div className="col-span-5 sm:col-span-1 text-right">Actions</div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="text-center py-12 text-xs text-text-dim">
            No documents match the specified filters.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="grid grid-cols-12 items-center px-4 py-3 text-xs hover:bg-bg-subtle/50 transition-colors cursor-pointer group"
            >
              <div className="col-span-5 sm:col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                <FileText className="h-4 w-4 text-text-muted group-hover:text-accent-primary shrink-0 transition-colors" />
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                    {doc.name}
                  </div>
                  <div className="text-[11px] text-text-dim font-mono truncate">
                    {doc.id} · Indexed {formatRelativeTime(doc.uploadedAt)}
                  </div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-2">
                {getClassificationBadge(doc.classification)}
              </div>

              <div className="col-span-2 sm:col-span-2 hidden sm:block text-text-muted truncate">
                {doc.department}
              </div>

              <div className="col-span-2 sm:col-span-2 hidden sm:block text-text-dim font-mono text-[11px]">
                {formatFileSize(doc.size)} · {doc.pages || 1} pgs
              </div>

              <div className="col-span-5 sm:col-span-1 flex items-center justify-end gap-1">
                <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-text-primary transition-colors" />
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Ingest Document Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => !isUploading && setUploadModalOpen(false)}
        title="Ingest Document into Sovereign Store"
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-muted">
            Uploaded files undergo on-premises local OCR extraction (DocTR), vector indexing, and SHA-256 anchoring. No data leaves this workstation.
          </p>

          <div className="border border-dashed border-border-default rounded-lg p-6 text-center space-y-2 bg-bg-primary/50">
            <Upload className="h-6 w-6 text-text-dim mx-auto" />
            <label className="block cursor-pointer text-text-secondary font-medium">
              Click to select files here
              <input type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
            </label>
            {selectedFile && <div className="text-accent-primary">Selected: {selectedFile.name}</div>}
            <div className="text-[11px] text-text-dim font-mono">
              Supported: PDF, DOCX, XLSX, DWG (Max 100MB)
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleUpload()}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing OCR & Vectors...</span>
                </>
              ) : (
                'Ingest File'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
