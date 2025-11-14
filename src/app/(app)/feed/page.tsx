
import { SidebarTrigger } from '@/components/ui/sidebar';
import Feed from './components/feed';

export const metadata = {
  title: 'Whispr Feed - Whispr',
};

export default function FeedPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b bg-card p-4 md:justify-center">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="text-center">
          <h1 className="font-headline text-xl font-bold md:text-3xl">
            Whispr Feed
          </h1>
          <p className="hidden text-muted-foreground md:block">
            A real-time feed of anonymous thoughts and feelings.
          </p>
        </div>
        <div className="hidden w-8 md:block">{/* Spacer */}</div>
      </header>
      <div className="flex-grow overflow-auto">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <Feed />
        </div>
      </div>
    </div>
  );
}
