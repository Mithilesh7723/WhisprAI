
'use client';

import React from 'react';
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
  // This component is now a "dumb" component that receives data via props.
  // All data fetching (useUser, useCollection, etc.) has been removed to prevent client-side permission errors.

  const [posts] = React.useState(initialPosts);
  const [actions] = React.useState(initialActions);

  // While initial data is loaded on the server, we can still show a loading state
  // if we were to introduce client-side updates/re-fetching in the future.
  // For now, isLoading is false as data is pre-loaded.
  const isLoading = false;

  return (
    <Tabs defaultValue="whispers">
      <TabsList className="grid w-full grid-cols-2 sm:w-96">
        <TabsTrigger value="whispers">Whispers</TabsTrigger>
        <TabsTrigger value="actions">Action Log</TabsTrigger>
      </TabsList>
      <TabsContent value="whispers">
        <DataTable columns={columns} data={posts ?? []} isLoading={isLoading} />
      </TabsContent>
      <TabsContent value="actions">
        <ActionLog actions={actions ?? []} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
}
