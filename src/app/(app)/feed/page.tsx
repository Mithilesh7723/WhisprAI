import Feed from './components/feed';

export const metadata = {
  title: 'Public Feed - Whispr',
};

export default function FeedPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold">Public Feed</h1>
        <p className="text-muted-foreground">
          Share what's on your mind. All whispers are anonymous.
        </p>
      </header>
      <Feed />
    </div>
  );
}
