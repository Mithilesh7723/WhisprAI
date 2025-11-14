import { cn } from '@/lib/utils';
import Link from 'next/link';

function LotusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 18a8.2 8.2 0 0 1-5.1-1.7" />
      <path d="M15.5 18a8.2 8.2 0 0 0 5.1-1.7" />
      <path d="M12 22a8.2 8.2 0 0 0-7.2-4.3" />
      <path d="M12 22a8.2 8.2 0 0 1 7.2-4.3" />
      <path d="M2 12a10 10 0 0 1 1.4-5" />
      <path d="M22 12a10 10 0 0 0-1.4-5" />
      <path d="M12 2a10 10 0 0 0-8.6 5" />
      <path d="M12 2a10 10 0 0 1 8.6 5" />
    </svg>
  );
}

export function AppLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Whispr Home">
      <div className={cn('flex items-center gap-2 text-lg font-bold tracking-wide text-foreground', className)}>
        <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
          <LotusIcon className="h-4 w-4" />
        </div>
        <span className="font-headline">Whispr</span>
      </div>
    </Link>
  );
}
