import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { cn } from 'cn';

const sizeStyles = {
  sm: {
    box: 'h-8 w-8 rounded-lg',
    icon: 'h-4 w-4',
    text: 'text-base',
  },
  md: {
    box: 'h-9 w-9 rounded-xl',
    icon: 'h-5 w-5',
    text: 'text-lg',
  },
  lg: {
    box: 'h-14 w-14 rounded-2xl',
    icon: 'h-7 w-7',
    text: 'text-2xl',
  },
} as const;

interface BrandLogoProps {
  href?: string | null;
  showText?: boolean;
  size?: keyof typeof sizeStyles;
  className?: string;
  textClassName?: string;
}

export function BrandLogo({
  href = '/',
  showText = true,
  size = 'md',
  className,
  textClassName,
}: BrandLogoProps) {
  const styles = sizeStyles[size];

  const content = (
    <>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-primary/10 text-primary shadow-inner ring-1 ring-primary/15',
          styles.box
        )}
        aria-hidden="true"
      >
        <Coffee className={styles.icon} />
      </span>
      {showText && (
        <span
          className={cn(
            'font-serif font-bold tracking-tight text-foreground',
            styles.text,
            textClassName
          )}
        >
          Lumbung MultiPOS
        </span>
      )}
    </>
  );

  const wrapperClassName = cn('flex items-center gap-2.5', className);

  if (!href) {
    return <span className={wrapperClassName}>{content}</span>;
  }

  return (
    <Link
      href={href}
      className={wrapperClassName}
      aria-label={showText ? undefined : 'Lumbung MultiPOS'}
    >
      {content}
    </Link>
  );
}
