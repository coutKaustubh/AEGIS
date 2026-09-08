import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  FileText,
  ArrowRight,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { chatService } from '@/services/chats';
import type { KnowledgeAnswer, KnowledgeSearchResult } from '@/types/knowledge';
import { DEPARTMENTS } from '@/lib/constants';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const SUGGESTED_QUERIES = [
  'H2S emergency evacuation protocol',
  'P-102B centrifugal pump vibration limit',
  'CDU-04 startup interlocks',
  'OISD-105 minimum wall thickness',
];

export default function KnowledgePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('H2S emergency evacuation protocol');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isAsking, setIsAsking] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<KnowledgeAnswer | null>(null);
  const filteredResults: KnowledgeSearchResult[] = [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAsking(true);
    try {
      const created = await chatService.ask(query);
      await chatService.streamEvents(created.task.id, () => undefined);
      const task = await chatService.getTask(created.task.id);
      setAiAnswer({ answer: task.response_text || task.error || 'No answer returned.', sources: [], model: task.model_used || 'Local model', processedLocally: true });
    } catch (cause) {
      setAiAnswer({ answer: cause instanceof Error ? cause.message : 'Knowledge query failed.', sources: [], model: 'AEGIS backend', processedLocally: true });
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Semantic retrieval & sovereign neural synthesis across verified operational manuals"
        badge={
          <Badge variant="outline" className="font-mono text-[10px] text-text-dim">
            Vector Store Ready
          </Badge>
        }
      />

      {/* Dominant Search Box */}
      <Card padding="md" className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-dim" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a technical or compliance question across internal manuals..."
              className="w-full rounded-md border border-border-default bg-bg-primary pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-dim focus:border-border-hover focus:outline-none transition-colors"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-md border border-border-default bg-bg-primary px-2.5 py-2 text-xs text-text-secondary focus:border-border-hover focus:outline-none"
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <Button type="submit" variant="primary" size="md" disabled={isAsking}>
            {isAsking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Synthesize</span>
          </Button>
        </form>

        {/* Suggested queries */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-text-dim font-mono mr-1">Frequent:</span>
          {SUGGESTED_QUERIES.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => {
                setQuery(sq);
              }}
              className="px-2 py-0.5 rounded text-[11px] text-text-muted hover:text-text-primary bg-bg-subtle/50 hover:bg-bg-subtle border border-border-subtle transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>
      </Card>

      {/* AI Synthesized Answer Card */}
      {aiAnswer && (
        <Card padding="md" className="border-border-default bg-bg-surface space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              <span className="text-xs font-semibold text-text-primary">
                Sovereign Synthesis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                {aiAnswer.model}
              </Badge>
              <button
                onClick={() =>
                  navigate(`/workspace?prompt=${encodeURIComponent(`Follow-up query regarding: ${query}`)}`)
                }
                className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                Continue in Workspace <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
            {aiAnswer.answer}
          </p>

          {/* Citations List */}
          <div className="pt-2 border-t border-border-subtle flex flex-wrap gap-2">
            {aiAnswer.sources.map((src, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-bg-primary border border-border-subtle text-[11px] text-text-muted"
              >
                <FileText className="h-3 w-3 text-text-dim" />
                <span className="font-medium text-text-secondary truncate max-w-xs">
                  {src.documentName}
                </span>
                <span className="text-text-dim font-mono">p.{src.page}</span>
                <span className="text-status-success font-mono text-[10px]">
                  {Math.round(src.relevance * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ranked Search Results */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
          Retrieved Excerpts ({filteredResults.length})
        </h2>

        <div className="space-y-2">
          {filteredResults.map((res) => (
            <Card
              key={res.id}
              padding="md"
              className="space-y-2 hover:border-border-hover transition-colors cursor-pointer group"
              onClick={() => navigate(`/documents/${res.documentId}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-text-dim group-hover:text-accent-primary shrink-0 transition-colors" />
                  <span className="font-medium text-xs text-text-primary group-hover:text-accent-primary truncate transition-colors">
                    {res.documentName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-text-dim font-mono">
                    p. {res.relevantPages.join(', ')}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {Math.round(res.relevanceScore * 100)}% Match
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-text-muted leading-relaxed italic border-l-2 border-border-subtle pl-2.5">
                "{res.snippet}"
              </p>

              <div className="flex items-center justify-between text-[11px] text-text-dim pt-1">
                <span>Department: {res.department}</span>
                <span className="text-accent-primary group-hover:underline flex items-center gap-0.5">
                  View Document <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
