
'use client';

import { useMemo } from 'react';
import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';

// This is now a "dumb" component that receives data as props.
export function Dashboard({ posts, actions }: { posts: Post[], actions: AdminAction[] }) {
  // No more client-side data fetching. We just display what we're given.
  const areQueriesLoading = false; // Data is pre-fetched on the server.

  return (
    <Tabs defaultValue="whispers">
      <TabsList className="grid w-full grid-cols-2 sm:w-96">
        <TabsTrigger value="whispers">Whispers</TabsTrigger>
        <TabsTrigger value="actions">Action Log</TabsTrigger>
      </TabsList>
      <TabsContent value="whispers">
        <DataTable columns={columns} data={posts ?? []} isLoading={areQueriesLoading} />
      </TabsContent>
      <TabsContent value="actions">
        <ActionLog actions={actions ?? []} isLoading={areQueriesLoading} />
      </TabsContent>
    </Tabs>
  );
}
