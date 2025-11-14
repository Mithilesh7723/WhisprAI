
'use client';

import { redirect } from 'next/navigation';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { FirebaseClientProvider, useUser } from '@/firebase';
import { adminLogout, getAdminSession } from '@/lib/actions';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function AdminHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <AppLogo />
          <span className="text-sm font-medium text-muted-foreground">
            Admin Dashboard
          </span>
        </div>
        <form action={adminLogout}>
          <Button variant="ghost" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </header>
  );
}

function PageContent() {
  const { user, isUserLoading } = useUser();
  const [isAdminSession, setIsAdminSession] = useState<boolean | null>(null);

  useEffect(() => {
    // We check the cookie on the client as a first-pass check.
    // The real security is the Firestore rules which will deny reads if the user isn't an admin.
    async function checkSession() {
      const session = await getAdminSession();
      if (!session) {
        redirect('/admin/login');
      }
      setIsAdminSession(true);
    }
    checkSession();
  }, []);

  if (isUserLoading || isAdminSession === null) {
     return (
      <>
        <AdminHeader />
        <main className="container mx-auto p-4">
           <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-96 w-full" />
           </div>
        </main>
      </>
    );
  }

  // The user object is now available and we've confirmed a cookie session exists.
  // The Dashboard component can now safely create queries.
  return (
    <>
      <AdminHeader />
      <main className="container mx-auto p-4">
        <Dashboard />
      </main>
    </>
  );
}


export default function AdminDashboardPage() {
  // The provider is essential for the client-side hooks to work.
  return (
    <FirebaseClientProvider>
      <div className="min-h-screen bg-secondary">
        <PageContent />
      </div>
    </FirebaseClientProvider>
  );
}
