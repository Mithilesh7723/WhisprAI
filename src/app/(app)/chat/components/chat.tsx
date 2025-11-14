'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAnonymousId } from '@/lib/hooks/use-anonymous-id';
import { sendChatMessage } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage, AIChat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, Send, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HelplinePanel } from '@/components/helpline-panel';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';

export default function Chat() {
  const anonymousId = useAnonymousId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const firestore = useFirestore();

  // Query for the user's chat history
  const chatQuery = useMemoFirebase(() => {
    if (!firestore || !anonymousId) return null;
    return query(collection(firestore, 'aiChats'), where('userId', '==', anonymousId), limit(1));
  }, [firestore, anonymousId]);

  const { data: chatHistory, isLoading: isHistoryLoading } = useCollection<AIChat>(chatQuery);

  // Set initial messages from history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setMessages(chatHistory[0].messages || []);
      setIsEscalated(chatHistory[0].escalated || false);
    } else {
        setMessages([]);
        setIsEscalated(false);
    }
  }, [chatHistory]);


  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !anonymousId || isLoading) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // We pass the full history to the server action now
    const res = await sendChatMessage(
      newMessages,
      input,
      anonymousId
    );
    
    const aiMessage: ChatMessage = {
        sender: 'ai',
        text: res.response,
        timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    if (res.escalate) {
        setIsEscalated(true);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-full flex-grow flex-col bg-background">
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="mx-auto max-w-2xl space-y-6">
            {(isHistoryLoading && messages.length === 0) && <div className="text-center text-muted-foreground p-8">Loading chat...</div>}
            {(!isHistoryLoading && messages.length === 0) && (
                <div className="text-center text-muted-foreground p-8 rounded-lg bg-card border">
                    <h2 className="font-headline text-lg text-foreground">Namaste.</h2>
                    <p className="mt-2">How are you feeling today?</p>
                    <p className="text-xs mt-4">This is a safe space to share. Remember, this is not medical advice. If you're in crisis, please use the resources provided.</p>
                </div>
            )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex items-end gap-2',
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs rounded-lg px-4 py-2 md:max-w-md',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border'
                )}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8">
                   <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                 <div className="max-w-xs rounded-lg px-4 py-2 md:max-w-md bg-card border">
                    <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-0"></span>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-150"></span>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-300"></span>
                    </div>
                </div>
            </div>
          )}
          {isEscalated && (
            <Alert variant="destructive" className="mt-6 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Support Resources</AlertTitle>
                <AlertDescription>
                    It sounds like you are going through a lot. Please consider reaching out to a professional for support.
                </AlertDescription>
                <div className="mt-4">
                    <HelplinePanel />
                </div>
            </Alert>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-card p-4">
        <form
          onSubmit={handleSendMessage}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share your feelings..."
            disabled={isLoading || isHistoryLoading}
            autoComplete="off"
            className="rounded-full"
          />
          <Button type="submit" size="icon" disabled={isLoading || isHistoryLoading || !input.trim()} className="rounded-full">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
