
'use client';

import { useMemo } from 'react';
import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';

export function Dashboard() {
  const firestore = useFirestore();
  const { user } = useUser();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; // Wait for user
    return query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const actionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; // Wait for user
    return query(collection(firestore, 'adminActions'), orderBy('timestamp', 'desc'), limit(100));
  }, [firestore, user]);

  const { data: posts, isLoading: postsLoading } = useCollection<Post>(postsQuery);
  const { data: rawActions, isLoading: actionsLoading } = useCollection<AdminAction>(actionsQuery);

  const sortedActions = useMemo(() => {
    if (!rawActions) return [];
    // Ensure client-side sorting as well, just in case
    return rawActions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rawActions]);

  const isLoading = postsLoading || actionsLoading;

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
        <ActionLog actions={sortedActions ?? []} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
}
