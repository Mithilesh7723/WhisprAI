
'use client';

import React, { useState, useMemo } from 'react';
import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';

interface DashboardProps {
    initialPosts: Post[];
    initialActions: AdminAction[];
}

export function Dashboard({ initialPosts, initialActions }: DashboardProps) {
  // The component now receives initial data as props from the server component parent.
  // It can manage its own state for filtering, sorting, etc.
  const [posts] = useState(initialPosts);
  const [actions] = useState(initialActions);

  const sortedActions = useMemo(() => {
    if (!actions) return [];
    // Sorting is still useful if we introduce client-side updates in the future.
    return actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [actions]);

  return (
    <Tabs defaultValue="whispers">
      <TabsList className="grid w-full grid-cols-2 sm:w-96">
        <TabsTrigger value="whispers">Whispers</TabsTrigger>
        <TabsTrigger value="actions">Action Log</TabsTrigger>
      </TabsList>
      <TabsContent value="whispers">
        <DataTable columns={columns} data={posts ?? []} />
      </TabsContent>
      <TabsContent value="actions">
        <ActionLog actions={sortedActions ?? []} />
      </TabsContent>
    </Tabs>
  );
}
