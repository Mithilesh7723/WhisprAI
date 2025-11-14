
import { SidebarTrigger } from '@/components/ui/sidebar';
import Feed from './components/feed';

export const metadata = {
  title: 'Whispr Feed - Whispr',
};

export default function FeedPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div>
          <h1 className="font-headline text-3xl font-bold">Whispr Feed</h1>
          <p className="text-muted-foreground">
            A real-time feed of anonymous thoughts and feelings.
          </p>
        </div>
      </header>
      <Feed />
    </div>
  );
}
