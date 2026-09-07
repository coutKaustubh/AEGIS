import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ArrowRight, LayoutDashboard, MessageSquare, BookOpen, Bot, CheckCircle, Shield, Server, Settings, Users, X } from 'lucide-react';
import { mockDocuments } from '@/data/mock-data';
import { useAuth } from '@/context/AuthContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Document' | 'Action';
  icon: React.ReactNode;
  onSelect: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const navItems: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'System overview and core operational metrics',
      category: 'Navigation',
      icon: <LayoutDashboard className="h-4 w-4" />,
      onSelect: () => navigate('/'),
    },
    {
      id: 'nav-workspace',
      title: 'AI Workspace',
      subtitle: 'Sovereign conversational intelligence and execution',
      category: 'Navigation',
      icon: <MessageSquare className="h-4 w-4" />,
      onSelect: () => navigate('/workspace'),
    },
    {
      id: 'nav-documents',
      title: 'Documents',
      subtitle: 'Classified document repository and ingest',
      category: 'Navigation',
      icon: <FileText className="h-4 w-4" />,
      onSelect: () => navigate('/documents'),
    },
    {
      id: 'nav-knowledge',
      title: 'Knowledge Base',
      subtitle: 'Semantic search and verified organizational memory',
      category: 'Navigation',
      icon: <BookOpen className="h-4 w-4" />,
      onSelect: () => navigate('/knowledge'),
    },
    {
      id: 'nav-agents',
      title: 'Agents',
      subtitle: 'Autonomous execution pipelines and telemetry',
      category: 'Navigation',
      icon: <Bot className="h-4 w-4" />,
      onSelect: () => navigate('/agents'),
    },
    {
      id: 'nav-approvals',
      title: 'Approvals Queue',
      subtitle: 'Human-in-the-loop verification and sign-off',
      category: 'Navigation',
      icon: <CheckCircle className="h-4 w-4" />,
      onSelect: () => navigate('/approvals'),
    },
    {
      id: 'nav-audit',
      title: 'Audit & Provenance',
      subtitle: 'Immutable cryptographic ledger and hash verification',
      category: 'Navigation',
      icon: <Shield className="h-4 w-4" />,
      onSelect: () => navigate('/audit'),
    },
    {
      id: 'nav-system',
      title: 'System Sovereignty',
      subtitle: 'Local air-gap enforcement, node health and hardware',
      category: 'Navigation',
      icon: <Server className="h-4 w-4" />,
      onSelect: () => navigate('/system'),
    },
    ...(isAdmin
      ? [
          {
            id: 'nav-users',
            title: 'User Management',
            subtitle: 'Air-gapped employee access governance and credentials',
            category: 'Navigation' as const,
            icon: <Users className="h-4 w-4" />,
            onSelect: () => navigate('/users'),
          },
        ]
      : []),
    {
      id: 'nav-settings',
      title: 'Settings',
      subtitle: 'Workbench configurations, models and blockchain hooks',
      category: 'Navigation',
      icon: <Settings className="h-4 w-4" />,
      onSelect: () => navigate('/settings'),
    },
  ];

  const docItems: CommandItem[] = mockDocuments.map((doc) => ({
    id: `doc-${doc.id}`,
    title: doc.name,
    subtitle: `${doc.classification} · ${doc.type.toUpperCase()} · ${(doc.size / 1024 / 1024).toFixed(1)} MB`,
    category: 'Document',
    icon: <FileText className="h-4 w-4" />,
    onSelect: () => navigate(`/documents/${doc.id}`),
  }));

  const allItems = [...navItems, ...docItems];

  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 8);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].onSelect();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-xl bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <Search className="h-4 w-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search documents, or jump to page..."
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-dim outline-none"
          />
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-secondary p-1 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border-subtle/40">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-dim">
              No matching commands or documents found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors ${
                    isSelected ? 'bg-bg-subtle text-text-primary' : 'text-text-secondary hover:bg-bg-subtle/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={isSelected ? 'text-accent-primary' : 'text-text-muted'}>
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate text-text-primary">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-text-dim truncate mt-0.5">{item.subtitle}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-text-dim px-1.5 py-0.5 rounded bg-bg-elevated border border-border-subtle">
                      {item.category}
                    </span>
                    <ArrowRight className={`h-3 w-3 ${isSelected ? 'text-text-primary opacity-100' : 'opacity-0'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border-subtle bg-bg-elevated/40 flex items-center justify-between text-[11px] text-text-dim font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ navigate</span>
            <span>•</span>
            <span>↵ select</span>
            <span>•</span>
            <span>esc close</span>
          </div>
          <span>AEGIS Command Palette</span>
        </div>
      </div>
    </div>
  );
}
