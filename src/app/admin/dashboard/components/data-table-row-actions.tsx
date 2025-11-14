
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
  generateAndSetAdminReply,
  togglePostVisibility,
  updatePostLabel,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useState, useTransition } from 'react';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const post = row.original as Post;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleUpdateLabel = async (label: AILabel) => {
    startTransition(async () => {
      try {
        const result = await updatePostLabel(post.postId, label);
        if (result.success) {
          toast({
            title: 'Success',
            description: `Post label updated to "${label}".`,
          });
        }
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Action Failed',
          description: e.message || 'Failed to update post label.',
        });
      }
    });
  };

  const handleToggleVisibility = async () => {
    startTransition(async () => {
      try {
        const result = await togglePostVisibility(post.postId);
        if (result.success) {
          toast({
            title: 'Success',
            description: `Post has been ${
              post.hidden ? 'made visible' : 'hidden'
            }.`,
          });
        }
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Action Failed',
          description: e.message || 'Failed to update post visibility.',
        });
      }
    });
  };

  const handleGenerateReply = async () => {
    startTransition(async () => {
      try {
        const result = await generateAndSetAdminReply(post.postId);
        if (result?.error || !result.reply) {
          throw new Error(result.error || 'Reply was empty.');
        }

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
                disabled={isPending}
              >
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateLabel('stressed')}
                disabled={isPending}
              >
                Stressed
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateLabel('need_help')}
                disabled={isPending}
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
