'use client';

import { Post, AdminAction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ActionLog } from './action-log';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

type DashboardProps = {
  initialPosts: Post[];
  initialActions: AdminAction[];
};

export function Dashboard({ initialPosts, initialActions }: DashboardProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const actionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'adminActions'), orderBy('timestamp', 'desc'));
  }, [firestore, user]);

  const { data: posts, isLoading: postsLoading } = useCollection<Post>(postsQuery);
  const { data: actions, isLoading: actionsLoading } = useCollection<AdminAction>(actionsQuery);

  return (
    <Tabs defaultValue="whispers">
      <TabsList className="grid w-full grid-cols-2 sm:w-96">
        <TabsTrigger value="whispers">Whispers</TabsTrigger>
        <TabsTrigger value="actions">Action Log</TabsTrigger>
      </TabsList>
      <TabsContent value="whispers">
        <DataTable columns={columns} data={posts || initialPosts} isLoading={postsLoading} />
      </TabsContent>
      <TabsContent value="actions">
        <ActionLog actions={actions || initialActions} isLoading={actionsLoading} />
      </TabsContent>
    </Tabs>
  );
}
