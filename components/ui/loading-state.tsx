import { Loader2 } from 'lucide-react';
import { cn } from 'cn';

const sizeStyles = {
  sm: {
    spinner: 'size-4',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
  default: {
    spinner: 'size-5',
    text: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    spinner: 'size-7',
    text: 'text-sm',
    gap: 'gap-2.5',
  },
} as const;

interface LoadingStateProps {
  label?: string;
  size?: keyof typeof sizeStyles;
  layout?: 'stacked' | 'inline';
  fullScreen?: boolean;
  className?: string;
}

export function LoadingState({
  label = 'Memuat data...',
  size = 'default',
  layout = 'stacked',
  fullScreen = false,
  className,
}: LoadingStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full items-center justify-center text-muted-foreground',
        layout === 'inline' ? 'flex-row' : 'flex-col',
        styles.gap,
        fullScreen ? 'min-h-[60vh]' : 'py-10',
        className
      )}
    >
      <Loader2
        className={cn('animate-spin text-primary', styles.spinner)}
        aria-hidden="true"
      />
      {label && <span className={styles.text}>{label}</span>}
    </div>
  );
}
