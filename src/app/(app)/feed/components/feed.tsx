
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Post } from '@/lib/types';
import { useAnonymousSignIn } from '@/lib/hooks/use-anonymous-sign-in';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { classifyWhisper } from '@/ai/flows/classify-whisper-messages';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { generateAdminReply } from '@/ai/flows/generate-admin-reply';
import { Bot, Sparkles } from 'lucide-react';

function FeedItem({ post }: { post: Post }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-foreground">{post.content}</p>
        {post.reply && (
          <div className="mt-3 rounded-md border bg-secondary/50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Bot className="h-4 w-4" />
              <span>AI-Generated Reply</span>
            </div>
            <p className="mt-1 text-sm italic text-secondary-foreground">"{post.reply}"</p>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
          <Badge
            variant={
              post.aiLabel === 'need_help'
                ? 'destructive'
                : post.aiLabel === 'stressed'
                ? 'default'
                : 'secondary'
            }
            className={cn(
              post.aiLabel === 'stressed' && 'bg-warning text-warning-foreground',
              post.aiLabel === 'normal' && 'border-green-500/30 bg-green-500/20 text-green-700',
            )}
          >
            {post.aiLabel.replace('_', ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Feed() {
  const { user, isLoading: isAuthLoading } = useAnonymousSignIn();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  
  const firestore = useFirestore();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Query for posts that are not hidden and order them by creation date
    return query(
      collection(firestore, 'posts'),
      where('hidden', '!=', true),
      orderBy('hidden', 'asc'), // This is a trick to be able to use a not-equal operator with an order by
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || content.trim().length < 5 || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Whisper must be at least 5 characters long.',
      });
      return;
    }
    setIsSubmitting(true);
    const originalContent = content;

    try {
      const postsCollection = collection(firestore, 'posts');

      // Check for duplicate posts by the same user
      const duplicateQuery = query(postsCollection, where('userId', '==', user.uid), where('content', '==', originalContent));
      const duplicateSnapshot = await getDocs(duplicateQuery);
      if (!duplicateSnapshot.empty) {
        toast({
          title: 'Already Shared',
          description: "You've already shared this whisper.",
        });
        setIsSubmitting(false);
        return;
      }
      
      let classification;
      try {
        classification = await classifyWhisper({ content: originalContent });
      } catch (classifyError: any) {
         console.error('AI classification failed:', classifyError);
         toast({
          variant: 'destructive',
          title: 'Service Busy',
          description: 'The AI is a bit overloaded right now. Please try sharing your whisper again in a moment.',
        });
        setIsSubmitting(false);
        return;
      }

      await addDoc(postsCollection, {
        userId: user.uid,
        content: originalContent,
        createdAt: new Date().toISOString(),
        aiLabel: classification.aiLabel,
        aiConfidence: classification.aiConfidence,
        hidden: false,
      }).catch(error => {
         errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: postsCollection.path,
            operation: 'create',
            requestResourceData: { content: '... sensitive content ...' },
          })
         );
         throw error;
      });

      toast({
        title: 'Success',
        description: "Your whisper has been shared.",
      });
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }

      try {
        const feedbackResult = await generateAdminReply({ message: originalContent });
        if (feedbackResult.reply) {
          setAiFeedback(feedbackResult.reply);
        }
      } catch (feedbackError) {
        console.error('AI feedback generation failed:', feedbackError);
        // Do not show a toast here, as the main post was successful.
        // It's a non-critical failure.
      }

    } catch (error) {
       console.error('Whisper submission failed:', error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not post your whisper. Please try again.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isLoading = isAuthLoading || isPostsLoading;

  return (
    <>
      <div className="mb-8">
        <form onSubmit={handleSubmit}>
            <Card>
            <CardContent className="p-4">
                <Textarea
                ref={textareaRef}
                name="content"
                placeholder="Share a thought, a feeling, a moment..."
                className="min-h-24 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
                required
                minLength={5}
                disabled={!user || isSubmitting}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !user || content.trim().length < 5} className="mt-2">
                    {isSubmitting ? 'Whispering...' : 'Whisper'}
                </Button>
                </div>
            </CardContent>
            </Card>
        </form>
      </div>

      <div className="space-y-4">
        {isLoading ? (
            Array.from({length: 3}).map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                         <div className="flex justify-between">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-6 w-1/5" />
                        </div>
                    </CardContent>
                </Card>
            ))
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <FeedItem key={post.id} post={post} />)
        ) : (
          <div className="text-center text-muted-foreground py-16">
            <p className="text-lg">The world is quiet right now.</p>
            <p>Be the first to share a whisper.</p>
          </div>
        )}
      </div>
      <Dialog open={!!aiFeedback} onOpenChange={() => setAiFeedback(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-primary" />A Thought for You
            </DialogTitle>
            <DialogDescription className="pt-4 text-base text-foreground">
              {aiFeedback}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
