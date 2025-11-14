
'use client';

import React, { useEffect, useRef, useActionState } from 'react';
import { Post } from '@/lib/types';
import { postWhisper } from '@/lib/actions';
import { useAnonymousSignIn } from '@/lib/hooks/use-anonymous-sign-in';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';

function PostForm() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2">
      {pending ? 'Whispering...' : 'Whisper'}
    </Button>
  );
}

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
              post.aiLabel === 'normal' && 'bg-info/20 text-info-foreground border-info/30',
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
  const { anonymousId, isLoading: isAuthLoading } = useAnonymousSignIn();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const firestore = useFirestore();

  const postsQuery = useMemoFirebase(() => {
    // Wait until authentication is complete before creating the query.
    if (!firestore || isAuthLoading) return null;
    return query(collection(firestore, 'posts'), where('hidden', '!=', true), orderBy('hidden'), orderBy('createdAt', 'desc'));
  }, [firestore, isAuthLoading]);

  const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);

  const [formState, formAction] = useActionState(postWhisper, { error: undefined, success: undefined });

  useEffect(() => {
    if (formState.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: formState.error,
      });
    }
    if(formState.success){
        formRef.current?.reset();
        toast({
          title: 'Success',
          description: "Your whisper has been shared.",
        });
    }
  }, [formState, toast]);
  
  const isLoading = isAuthLoading || isPostsLoading;

  return (
    <>
      <form action={formAction} ref={formRef} className="mb-8">
        <Card>
          <CardContent className="p-4">
            <Textarea
              name="content"
              placeholder="Share a thought, a feeling, a moment..."
              className="min-h-24 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
              required
              minLength={5}
              disabled={!anonymousId}
            />
            <input type="hidden" name="userId" value={anonymousId || ''} />
            <div className="flex justify-end">
              <PostForm />
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
