'use client';

import { useState } from 'react';
import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';

type DashboardProps = {
  initialPosts: Post[];
  initialActions: AdminAction[];
};

export function Dashboard({ initialPosts, initialActions }: DashboardProps) {
  const [posts] = useState(initialPosts);
  const [actions] = useState(initialActions);

  return (
    <Tabs defaultValue="whispers">
      <TabsList className="grid w-full grid-cols-2 sm:w-96">
        <TabsTrigger value="whispers">Whispers</TabsTrigger>
        <TabsTrigger value="actions">Action Log</TabsTrigger>
      </TabsList>
      <TabsContent value="whispers">
        <DataTable columns={columns} data={posts} />
      </TabsContent>
      <TabsContent value="actions">
        <ActionLog actions={actions} />
      </TabsContent>
    </Tabs>
  );
}
