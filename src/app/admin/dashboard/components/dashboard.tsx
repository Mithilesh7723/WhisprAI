
'use client';

import React, { useMemo } from 'react';
import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

interface DashboardProps {
  initialPosts: Post[];
  initialActions: AdminAction[];
}

export function Dashboard({ initialPosts, initialActions }: DashboardProps) {
  const firestore = useFirestore();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null; 
    return query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const actionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'adminActions'), orderBy('timestamp', 'desc'));
  }, [firestore]);
  
  // useCollection will use initial data and then listen for real-time updates.
  const { data: posts, isLoading: postsLoading } = useCollection<Post>(postsQuery);
  const { data: actions, isLoading: actionsLoading } = useCollection<AdminAction>(actionsQuery);

  const displayPosts = posts ?? initialPosts;
  const displayActions = actions ?? initialActions;

  return (
    <Tabs defaultValue="whispers">
      <TabsList className="grid w-full grid-cols-2 sm:w-96">
        <TabsTrigger value="whispers">Whispers</TabsTrigger>
        <TabsTrigger value="actions">Action Log</TabsTrigger>
      </TabsList>
      <TabsContent value="whispers">
        <DataTable columns={columns} data={displayPosts} isLoading={postsLoading && !displayPosts.length} />
      </TabsContent>
      <TabsContent value="actions">
        <ActionLog actions={displayActions} isLoading={actionsLoading && !displayActions.length} />
      </TabsContent>
    </Tabs>
  );
}
