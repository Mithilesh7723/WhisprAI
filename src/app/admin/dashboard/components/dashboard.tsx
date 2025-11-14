
'use client';

import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';

// This is now a "dumb" component that receives data as props.
export function Dashboard({ posts, actions }: { posts: Post[], actions: AdminAction[] }) {
  // Data is pre-fetched on the server. isLoading is always false on the client.
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
