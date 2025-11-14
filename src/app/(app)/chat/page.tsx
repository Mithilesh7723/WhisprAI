
'use client';
import Chat from './components/chat';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b bg-card p-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="text-center flex-grow">
          <h1 className="font-headline text-xl font-bold">WhisprAI</h1>
          <p className="text-sm text-muted-foreground">
            A safe space to talk. WhisprAI is here to listen.
          </p>
        </div>
        <div className="w-8 md:hidden">{/* Spacer for balance */}</div>
      </header>
      <Chat />
    </div>
  );
}
