
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
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isAdminSession, setIsAdminSession] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAndSignInAdmin() {
      // 1. Check for the server-side session cookie first.
      const session = await getAdminSession();
      if (!session || !session.isAdmin) {
        redirect('/admin/login');
        return;
      }
      setIsAdminSession(true);

      // 2. If there's no Firebase user or it's not the admin, sign in client-side.
      // This is safe because we've already verified the secure HTTP-only cookie.
      if (auth.currentUser?.email !== 'admin@whispr.com') {
        try {
          // Use hardcoded credentials for client-side sign-in.
          await signInWithEmailAndPassword(auth, 'admin@whispr.com', 'password123');
          // onAuthStateChanged in the provider will handle setting the user state
        } catch (e: any) {
            console.error("Admin client-side sign-in failed:", e);
            setError("Your admin session is invalid. Please sign out and sign back in.");
        }
      }
    }
    
    // Only run this logic once the initial auth state has been determined.
    if (!isUserLoading && auth) {
      checkAndSignInAdmin();
    }
  }, [isUserLoading, auth]);


  // Show loading state while checking for cookie or waiting for Firebase auth
  if (isAdminSession === null || isUserLoading) {
     return (
      <>
        <AdminHeader />
        <main className="container mx-auto p-4">
           <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-10 w-96 mb-4" />
              <Skeleton className="h-96 w-full" />
           </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
        <>
        <AdminHeader />
        <main className="container mx-auto p-4">
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </main>
      </>
    )
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
