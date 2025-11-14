
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
    // Only create the query if the user is authenticated on the client.
    if (!firestore || !user) return null;
    return query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: posts, isLoading: postsLoading } = useCollection<Post>(postsQuery);

  const actionsQuery = useMemoFirebase(() => {
    // Only create the query if the user is authenticated on the client.
    if (!firestore || !user) return null;
    return query(collection(firestore, 'adminActions'), orderBy('timestamp', 'desc'), limit(50));
  }, [firestore, user]);

  const { data: actions, isLoading: actionsLoading } = useCollection<AdminAction>(actionsQuery);
  
  const sortedActions = useMemo(() => {
    if (!actions) return [];
    // Ensure client-side sorting as well, just in case
    return actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [actions]);

  const areQueriesLoading = postsLoading || actionsLoading;

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
        <ActionLog actions={sortedActions ?? []} isLoading={areQueriesLoading} />
      </TabsContent>
    </Tabs>
  );
}
