import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key || '');
  const currentTab = tabs.find((t) => t.key === active);

  return (
    <div className={className}>
      <div className="flex gap-0 border-b border-border-default">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium transition-colors duration-150 border-b-2 -mb-px',
              active === tab.key
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{currentTab?.content}</div>
    </div>
  );
}
