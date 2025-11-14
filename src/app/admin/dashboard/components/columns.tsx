
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Post, AILabel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { DataTableRowActions } from './data-table-row-actions';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const columns: ColumnDef<Post>[] = [
  {
    accessorKey: 'content',
    header: 'Content',
    cell: ({ row }) => {
      const content: string = row.getValue('content');
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-xs truncate font-medium">{content}</div>
            </TooltipTrigger>
            <TooltipContent className="max-w-md" side="bottom" align="start">
              <p className="whitespace-pre-wrap">{content}</p>
              {row.original.reply && (
                <div className="mt-2 border-t pt-2">
                    <p className="font-bold text-xs text-muted-foreground">AI-Generated Reply:</p>
                    <p className="italic">{row.original.reply}</p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: 'aiLabel',
    header: 'AI Label',
    cell: ({ row }) => {
      const label = row.getValue('aiLabel') as AILabel;
      return (
        <Badge
          variant={
            label === 'need_help'
              ? 'destructive'
              : label === 'stressed'
              ? 'default'
              : 'secondary'
          }
          className={cn(
            'w-24 justify-center capitalize',
            label === 'stressed' && 'bg-warning text-warning-foreground',
            label === 'normal' &&
              'border-green-500/30 bg-green-500/20 text-green-700'
          )}
        >
          {label.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'aiConfidence',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Confidence
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const confidence = parseFloat(row.getValue('aiConfidence'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'percent',
      }).format(confidence);
      return <div className="text-center font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Timestamp
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return (
        <div className="text-left">{format(date, 'MMM d, yyyy, h:mm a')}</div>
      );
    },
  },
  {
    accessorKey: 'userId',
    header: 'User ID',
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
