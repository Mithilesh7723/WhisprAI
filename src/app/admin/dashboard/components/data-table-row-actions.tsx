
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
import {
  generateAdminReplyAction,
  verifyAdminForUpdate,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useState, useTransition } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { revalidatePath } from 'next/cache';

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

  const handleUpdateLabel = (label: AILabel) => {
    startTransition(async () => {
      try {
        const { success, adminId } = await verifyAdminForUpdate();
        if (!success || !adminId) {
          throw new Error('Admin verification failed.');
        }

        const postRef = doc(firestore, 'posts', post.postId);
        const actionsRef = collection(firestore, 'adminActions');

        // Perform Firestore writes and wrap in error handler
        updateDoc(postRef, { aiLabel: label }).catch((error) => {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: postRef.path,
              operation: 'update',
              requestResourceData: { aiLabel: label },
            })
          );
          throw error; // Re-throw to be caught by outer try-catch
        });

        addDoc(actionsRef, {
          adminId,
          targetId: post.postId,
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
          description: `Post label updated to "${label}". (UI will refresh)`,
        });
        // revalidatePath('/admin/dashboard'); // This is a server action, can't be called here. Client will see changes on next load.

      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Action Failed',
          description:
            e.message || 'Failed to update post label.',
        });
      }
    });
  };

  const handleToggleVisibility = () => {
    startTransition(async () => {
      try {
        const { success, adminId } = await verifyAdminForUpdate();
        if (!success || !adminId) {
          throw new Error('Admin verification failed.');
        }
        
        const isHidden = post.hidden || false;
        const newVisibility = !isHidden;
        const postRef = doc(firestore, 'posts', post.postId);
        const actionsRef = collection(firestore, 'adminActions');

        updateDoc(postRef, { hidden: newVisibility }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: postRef.path,
                operation: 'update',
                requestResourceData: { hidden: newVisibility }
            }));
            throw error;
        });

        addDoc(actionsRef, {
            adminId,
            targetId: post.postId,
            type: newVisibility ? 'hide' : 'unhide',
            timestamp: new Date().toISOString(),
            details: { wasHidden: isHidden },
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: actionsRef.path,
                operation: 'create',
                requestResourceData: { type: newVisibility ? 'hide' : 'unhide' }
            }));
            throw error;
        });

        toast({
          title: 'Success',
          description: `Post has been ${ newVisibility ? 'hidden' : 'made visible' }. (UI will refresh)`,
        });

      } catch (e: any) {
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
      try {
        // Step 1: Call server action to securely get the AI reply
        const result = await generateAdminReplyAction(post.postId);
        if (result?.error || !result.reply) {
          throw new Error(result.error || 'Reply was empty.');
        }

        // The server action already verified the admin, so we get the adminId from it
        const { adminId } = await verifyAdminForUpdate();
        if (!adminId) throw new Error("Could not verify admin.");

        // Step 2: Update the post on the client with the reply
        const postRef = doc(firestore, 'posts', post.postId);
        const actionsRef = collection(firestore, 'adminActions');

        updateDoc(postRef, { reply: result.reply }).catch(error => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: postRef.path,
                operation: 'update',
                requestResourceData: { reply: result.reply }
            }));
            throw error;
        });

        addDoc(actionsRef, {
            adminId,
            targetId: post.postId,
            type: 'reply',
            timestamp: new Date().toISOString(),
            details: { generatedReply: result.reply },
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: actionsRef.path,
                operation: 'create',
                requestResourceData: { type: 'reply' }
            }));
            throw error;
        });

        toast({
          title: 'Success',
          description: 'AI reply has been generated and attached. (UI will refresh)',
        });
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Action Failed',
          description: e.message || 'Failed to generate AI reply.',
        });
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
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
