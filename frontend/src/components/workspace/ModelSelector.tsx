import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Zap, Brain, Eye, Code2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AegisModel, getModels } from '@/services/models';

const capabilityConfig: Record<
  AegisModel['capability'],
  { icon: typeof Brain; color: string; bg: string }
> = {
  Reasoning: { icon: Brain, color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  Speed: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  Vision: { icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' },
  Code: { icon: Code2, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  General: { icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
};

interface ModelSelectorProps {
  selectedModel: AegisModel;
  onSelectModel: (model: AegisModel) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const models = getModels();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  const selectedConfig = capabilityConfig[selectedModel.capability];
  const SelectedIcon = selectedConfig.icon;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors',
          'text-text-muted hover:text-text-primary hover:bg-bg-subtle',
          open && 'bg-bg-subtle text-text-primary'
        )}
      >
        <SelectedIcon className={cn('h-3 w-3', selectedConfig.color)} />
        <span className="hidden sm:inline max-w-[100px] truncate">{selectedModel.name}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-text-dim transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown popover */}
      {open && (
        <div
          className={cn(
            'absolute bottom-full mb-1.5 left-0 z-50',
            'w-72 rounded-lg border border-border-default bg-bg-surface shadow-xl shadow-black/40',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border-subtle">
            <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider font-mono">
              Select Model
            </span>
          </div>

          {/* Model list */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {models.map((model) => {
              const config = capabilityConfig[model.capability];
              const Icon = config.icon;
              const isSelected = model.id === selectedModel.id;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(model);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors',
                    isSelected
                      ? 'bg-bg-subtle'
                      : 'hover:bg-bg-subtle/50'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border mt-0.5',
                      config.bg
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {model.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-text-dim">
                          {model.contextWindow}
                        </span>
                        {isSelected && (
                          <Check className="h-3 w-3 text-accent-primary" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-text-muted leading-snug mt-0.5 line-clamp-1">
                      {model.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-border-subtle">
            <span className="text-[10px] text-text-dim font-mono">
              All models run locally on sovereign enclave
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
