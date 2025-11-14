import Chat from './components/chat';

export const metadata = {
  title: 'AI Helper - Whispr',
};

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
       <header className="border-b bg-card p-4">
        <h1 className="text-center font-headline text-xl font-bold">
          AI Helper
        </h1>
        <p className="text-center text-sm text-muted-foreground">
            A safe space to talk. The AI is here to listen.
        </p>
      </header>
      <Chat />
    </div>
  );
}
