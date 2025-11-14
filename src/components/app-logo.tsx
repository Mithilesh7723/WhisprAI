import { Feather } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function AppLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Whispr Home">
      <div className={cn('flex items-center gap-2 text-lg font-bold tracking-wide text-foreground', className)}>
        <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
          <Feather className="h-4 w-4" />
        </div>
        <span className="font-headline">Whispr</span>
      </div>
    </Link>
  );
}
