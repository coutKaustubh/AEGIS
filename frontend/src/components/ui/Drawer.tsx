import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = 'w-[400px]' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      )}

      {/* Drawer Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full border-l border-border-default bg-bg-surface shadow-2xl',
          'transform transition-transform duration-200 ease-out',
          width,
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border-default px-5 py-3">
            <h3 className="text-sm font-medium text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="rounded p-1 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  );
}
