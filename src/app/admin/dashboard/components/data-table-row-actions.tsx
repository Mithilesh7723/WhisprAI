
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
import { generateAndSetAdminReply } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
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
  const [isPending, setIsPending] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  const handleUpdateLabel = async (label: AILabel) => {
    if (!firestore || !user) return;
    setIsPending(true);
    const postRef = doc(firestore, 'posts', post.postId);
    const actionsRef = collection(firestore, 'adminActions');
    const actionData = {
      adminId: user.uid,
      targetId: post.postId,
      type: 're-label',
      timestamp: new Date().toISOString(),
      details: { from: post.aiLabel, to: label },
    };

    try {
      // Intentionally not awaiting promises to let UI update optimistically
      updateDoc(postRef, { aiLabel: label }).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: postRef.path,
              operation: 'update',
              requestResourceData: { aiLabel: label }
          }));
          throw error; // Let outer catch handle UI
      });

      addDoc(actionsRef, actionData).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: actionsRef.path,
              operation: 'create',
              requestResourceData: actionData
          }));
          // This error is for logging, less critical for UI state
          console.error("Failed to log admin action:", error);
      });
      
      toast({
        title: 'Success',
        description: `Post label updated to "${label}".`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: e.message || 'Failed to update post label.',
      });
    } finally {
        setIsPending(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!firestore || !user) return;
    setIsPending(true);
    const isHidden = post.hidden || false;
    const postRef = doc(firestore, 'posts', post.postId);
    const actionsRef = collection(firestore, 'adminActions');
     const actionData = {
      adminId: user.uid,
      targetId: post.postId,
      type: isHidden ? 'unhide' : 'hide',
      timestamp: new Date().toISOString(),
      details: { wasHidden: isHidden },
    };

    try {
       updateDoc(postRef, { hidden: !isHidden }).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: postRef.path,
              operation: 'update',
              requestResourceData: { hidden: !isHidden }
          }));
          throw error;
      });

      addDoc(actionsRef, actionData).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: actionsRef.path,
              operation: 'create',
              requestResourceData: actionData
          }));
          console.error("Failed to log admin action:", error);
      });

      toast({
        title: 'Success',
        description: `Post has been ${isHidden ? 'made visible' : 'hidden'}.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: e.message || 'Failed to update post visibility.',
      });
    } finally {
        setIsPending(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!firestore || !user) return;
    setIsPending(true);

    try {
        const result = await generateAndSetAdminReply(post.postId);
        if (result?.error || !result.reply) {
            throw new Error(result.error || 'Reply was empty.');
        }

        const postRef = doc(firestore, 'posts', post.postId);
        const actionsRef = collection(firestore, 'adminActions');
        const actionData = {
            adminId: user.uid,
            targetId: post.postId,
            type: 'reply',
            timestamp: new Date().toISOString(),
            details: { generatedReply: result.reply },
        };
        
        updateDoc(postRef, { reply: result.reply }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: postRef.path,
                operation: 'update',
                requestResourceData: { reply: result.reply }
            }));
            throw error;
        });

        addDoc(actionsRef, actionData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: actionsRef.path,
                operation: 'create',
                requestResourceData: actionData
            }));
             console.error("Failed to log admin action:", error);
        });

        toast({
            title: 'Success',
            description: 'AI reply has been generated and attached.',
        });

    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: e.message || 'Failed to generate AI reply.',
        });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={!user}>
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
              <DropdownMenuItem onClick={() => handleUpdateLabel('normal')}>
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateLabel('stressed')}>
                Stressed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateLabel('need_help')}>
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
