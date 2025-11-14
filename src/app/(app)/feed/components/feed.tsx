
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
import { collection, query, where, addDoc } from 'firebase/firestore';
import { classifyWhisper } from '@/ai/flows/classify-whisper-messages';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function FeedItem({ post }: { post: Post }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-foreground">{post.content}</p>
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
  
  const firestore = useFirestore();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // This query is now simpler and relies on client-side sorting.
    return query(collection(firestore, 'posts'), where('hidden', '==', false));
  }, [firestore, user]);

  const { data: rawPosts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);

  // Perform client-side sorting.
  const posts = useMemo(() => {
    if (!rawPosts) return [];
    return rawPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawPosts]);

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

    try {
      const classification = await classifyWhisper({ content });
      const postsCollection = collection(firestore, 'posts');

      await addDoc(postsCollection, {
        userId: user.uid,
        content,
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
         )
         // Re-throw to be caught by the outer try-catch
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
    } catch (error) {
       console.error('Client-side postWhisper failed:', error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not process your whisper. Please try again.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isLoading = isAuthLoading || isPostsLoading;

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-8">
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
    </>
  );
}
