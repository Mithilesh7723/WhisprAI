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
  updatePostLabel,
  togglePostVisibility,
  generateAndSetAdminReply,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const post = row.original as Post;
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleAction = async (
    action: Promise<any>,
    successMessage: string,
    errorMessage: string
  ) => {
    setIsPending(true);
    try {
      const result = await action;
      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: 'Success',
        description: successMessage,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: e.message || errorMessage,
      });
    } finally {
        setIsPending(false);
    }
  };

  const handleUpdateLabel = (label: AILabel) => {
    handleAction(
      updatePostLabel(post.postId, label),
      `Post label updated to "${label}".`,
      'Failed to update post label.'
    );
  };

  const handleToggleVisibility = () => {
    const isHidden = post.hidden || false;
    handleAction(
      togglePostVisibility(post.postId),
      `Post has been ${isHidden ? 'made visible' : 'hidden'}.`,
      'Failed to update post visibility.'
    );
  };

  const handleGenerateReply = () => {
    handleAction(
      generateAndSetAdminReply(post.postId),
      'AI reply has been generated and attached.',
      'Failed to generate AI reply.'
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
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
