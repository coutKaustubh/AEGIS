import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-md border bg-bg-elevated px-3 py-2 text-[13px] text-text-primary',
          'placeholder:text-text-tertiary',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-1',
          error
            ? 'border-danger/40 focus:border-danger focus:ring-danger/30'
            : 'border-border-default focus:border-accent/50 focus:ring-accent/20',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  ),
);

Input.displayName = 'Input';
