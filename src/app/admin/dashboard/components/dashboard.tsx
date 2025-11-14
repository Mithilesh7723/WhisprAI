
'use client';

import React from 'react';
import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export function Dashboard() {
  const firestore = useFirestore();
  // useUser() hook is crucial to ensure we don't query before auth is ready.
  const { user, isUserLoading } = useUser();

  const postsQuery = useMemoFirebase(() => {
    // CRITICAL: Do not create the query until we have a user object.
    if (!firestore || !user) return null; 
    return query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const actionsQuery = useMemoFirebase(() => {
    // CRITICAL: Do not create the query until we have a user object.
    if (!firestore || !user) return null;
    return query(collection(firestore, 'adminActions'), orderBy('timestamp', 'desc'));
  }, [firestore, user]);
  
  const { data: posts, isLoading: postsLoading } = useCollection<Post>(postsQuery);
  const { data: actions, isLoading: actionsLoading } = useCollection<AdminAction>(actionsQuery);

  // Determine overall loading state based on auth check and collection loading.
  const isLoading = isUserLoading || (postsLoading && !posts) || (actionsLoading && !actions);

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
