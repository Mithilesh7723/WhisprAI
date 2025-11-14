
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAnonymousSignIn } from '@/lib/hooks/use-anonymous-sign-in';
import { runAiChat } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage, AIChat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HelplinePanel } from '@/components/helpline-panel';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function Chat() {
  const { user, isLoading: isAuthLoading } = useAnonymousSignIn();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [errorState, setErrorState] = useState<{ messageId: string | null }>({ messageId: null });

  const firestore = useFirestore();

  const chatQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'aiChats'), where('userId', '==', user.uid), limit(1));
  }, [firestore, user?.uid]);

  const { data: chatHistory, isLoading: isHistoryLoading } = useCollection<AIChat>(chatQuery);

  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const chat = chatHistory[0];
      setMessages(chat.messages || []);
      setIsEscalated(chat.escalated || false);
      setSessionId(chat.id);
    } else {
        setMessages([]);
        setIsEscalated(false);
        setSessionId(undefined);
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

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || !user?.uid || isLoading || !firestore) return;

    setErrorState({ messageId: null });
    setIsLoading(true);
    setInput('');

    const userMessage: ChatMessage = {
      sender: 'user',
      text: messageContent,
      timestamp: new Date().toISOString(),
    };

    const currentMessages = messages.filter(m => m.timestamp !== errorState.messageId);
    const updatedMessages = [...currentMessages, userMessage];
    setMessages(updatedMessages);

    // Pass an empty array to remove memory
    const historyForAI: ChatMessage[] = [];

    try {
      const res = await runAiChat(
        messageContent,
        user.uid,
        historyForAI, 
        sessionId
      );
      
      const aiMessage: ChatMessage = {
          sender: 'ai',
          text: res.response,
          timestamp: new Date().toISOString(),
      };
      
      let chatDocRef;
      if (sessionId) {
        chatDocRef = doc(firestore, 'aiChats', sessionId);
      } else {
        const newDocRef = doc(collection(firestore, 'aiChats'));
        chatDocRef = newDocRef;
        setSessionId(newDocRef.id);
      }
      
      const firestoreMessages = [...updatedMessages, aiMessage];

      setDoc(chatDocRef, {
          userId: user.uid,
          messages: firestoreMessages,
          escalated: res.escalate || isEscalated,
          lastUpdatedAt: new Date().toISOString()
      }, { merge: true }).catch(error => {
         errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: chatDocRef.path,
            operation: 'write',
            requestResourceData: { escalated: res.escalate },
          })
         )
         // Don't re-throw here, as the global handler will catch it.
      });

      // Update local state after successful Firestore operation
      setMessages(firestoreMessages);
       if (res.escalate) {
          setIsEscalated(true);
      }

    } catch (error) {
      console.error("Failed to send message or update chat:", error);
      // Set error state to show the "Try Again" UI
      setErrorState({ messageId: userMessage.timestamp });
      // Keep the user's message in the chat list
      setMessages(updatedMessages); 
      // Restore the input so the user can retry
      setInput(messageContent); 
    } finally {
        setIsLoading(false);
    }
  }, [user?.uid, isLoading, firestore, messages, sessionId, isEscalated, errorState.messageId]);

  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSendMessage(input);
  };

  const isPageLoading = isAuthLoading || isHistoryLoading;

  return (
    <div className="flex h-full flex-grow flex-col bg-background">
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="mx-auto max-w-2xl space-y-6">
            {(isPageLoading && messages.length === 0) && <div className="text-center text-muted-foreground p-8">Loading chat...</div>}
            {(!isPageLoading && messages.length === 0) && (
                <div className="text-center text-muted-foreground p-8 rounded-lg bg-card border">
                    <h2 className="font-headline text-lg text-foreground">Namaste.</h2>
                    <p className="mt-2">How are you feeling today?</p>
                    <p className="text-xs mt-4">This is a safe space to share. Remember, this is not medical advice. If you're in crisis, please use the resources provided.</p>
                </div>
            )}
          {messages.map((message, index) => (
            <div key={index}>
              <div
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
               {errorState.messageId === message.timestamp && message.sender === 'user' && (
                  <div className="flex justify-end mt-2">
                    <div className="text-xs text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Could not get a response.</span>
                      <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => handleSendMessage(message.text)}>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
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
          onSubmit={handleFormSubmit}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share your feelings..."
            disabled={isLoading || isPageLoading}
            autoComplete="off"
            className="rounded-full"
          />
          <Button type="submit" size="icon" disabled={isLoading || isPageLoading || !input.trim()} className="rounded-full">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
