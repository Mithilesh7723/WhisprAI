'use client';

import { Row } from '@tanstack/react-table';
import { Post, AILabel } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Bot, Eye, EyeOff, Tag } from 'lucide-react';
import { generateAdminReply } from '@/ai/flows/generate-admin-reply';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, addDoc, collection, writeBatch, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const post = row.original as Post;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { user } = useUser();

  const handleUpdateLabel = (label: AILabel) => {
    startTransition(async () => {
      if (!firestore || !user) return;

      const postRef = doc(firestore, 'posts', post.id);
      const actionsRef = collection(firestore, 'adminActions');

      try {
        await updateDoc(postRef, { aiLabel: label }).catch((error) => {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: postRef.path,
              operation: 'update',
              requestResourceData: { aiLabel: label },
            })
          );
          throw error;
        });

        await addDoc(actionsRef, {
          adminId: user.uid,
          targetId: post.id,
          type: 're-label',
          timestamp: new Date().toISOString(),
          details: { from: post.aiLabel, to: label },
        }).catch((error) => {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: actionsRef.path,
              operation: 'create',
              requestResourceData: { type: 're-label' },
            })
          );
          throw error;
        });

        toast({
          title: 'Success',
          description: `Post label updated to "${label}".`,
        });
      } catch (e: any) {
        if (!(e instanceof FirestorePermissionError)) {
            toast({
                variant: 'destructive',
                title: 'Action Failed',
                description: e.message || 'Failed to update post label.',
            });
        }
      }
    });
  };

  const handleToggleVisibility = () => {
    startTransition(async () => {
        if (!firestore || !user) return;
        const isHidden = post.hidden || false;
        const newVisibility = !isHidden;

        // Define refs for source and destination collections
        const sourceCollection = isHidden ? 'hidden_posts' : 'posts';
        const destCollection = isHidden ? 'posts' : 'hidden_posts';
        
        const sourceDocRef = doc(firestore, sourceCollection, post.id);
        const destDocRef = doc(firestore, destCollection, post.id);
        const actionsRef = collection(firestore, 'adminActions');

        try {
            const batch = writeBatch(firestore);

            // 1. Get the document to move
            const docSnap = await getDoc(sourceDocRef);
            if (!docSnap.exists()) {
                throw new Error("Post not found to move.");
            }
            const postData = docSnap.data();

            // 2. Set it in the new collection
            batch.set(destDocRef, { ...postData, hidden: newVisibility });

            // 3. Delete it from the old collection
            batch.delete(sourceDocRef);
            
            // 4. Log the admin action
            const logActionPromise = addDoc(actionsRef, {
                adminId: user.uid,
                targetId: post.id,
                type: newVisibility ? 'hide' : 'unhide',
                timestamp: new Date().toISOString(),
                details: { wasHidden: isHidden },
            });
            
            // Commit the batch and wait for log
            await Promise.all([batch.commit(), logActionPromise]);

            toast({
                title: 'Success',
                description: `Post has been ${newVisibility ? 'hidden' : 'made visible'}.`,
            });
        } catch (e: any) {
            console.error("Error toggling visibility:", e);
             toast({
                variant: 'destructive',
                title: 'Action Failed',
                description: e.message || 'Failed to update post visibility.',
            });
        }
    });
};


  const handleGenerateReply = () => {
    startTransition(async () => {
      if (!firestore || !user) return;
      try {
        const result = await generateAdminReply({ message: post.content });
        if (!result.reply) {
          throw new Error('Reply was empty.');
        }

        const postRef = doc(firestore, 'posts', post.id);
        const actionsRef = collection(firestore, 'adminActions');

        await updateDoc(postRef, { reply: result.reply }).catch((error) => {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: postRef.path,
              operation: 'update',
              requestResourceData: { reply: '...' }, // Don't log full reply
            })
          );
          throw error;
        });

        await addDoc(actionsRef, {
          adminId: user.uid,
          targetId: post.id,
          type: 'reply',
          timestamp: new Date().toISOString(),
          details: { generatedReply: result.reply },
        }).catch((error) => {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: actionsRef.path,
              operation: 'create',
              requestResourceData: { type: 'reply' },
            })
          );
          throw error;
        });

        toast({
          title: 'Success',
          description: 'AI reply has been generated and attached.',
        });
      } catch (e: any) {
        if (!(e instanceof FirestorePermissionError)) {
            toast({
              variant: 'destructive',
              title: 'Action Failed',
              description: e.message || 'Failed to generate AI reply.',
            });
        }
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending || !user}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isPending}>
            <Tag className="mr-2 h-4 w-4" />
            Re-label
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handleUpdateLabel('normal')}
                disabled={isPending || post.aiLabel === 'normal'}
              >
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateLabel('stressed')}
                disabled={isPending || post.aiLabel === 'stressed'}
              >
                Stressed
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateLabel('need_help')}
                disabled={isPending || post.aiLabel === 'need_help'}
              >
                Need Help
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={handleToggleVisibility} disabled={isPending}>
          {post.hidden ? (
            <Eye className="mr-2 h-4 w-4" />
          ) : (
            <EyeOff className="mr-2 h-4 w-4" />
          )}
          {post.hidden ? 'Make Visible' : 'Hide Post'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGenerateReply} disabled={isPending}>
          <Bot className="mr-2 h-4 w-4" />
          Generate AI Reply
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
