
'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { adminLogout, getAdminSession } from '@/lib/actions';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAndSignInAdmin() {
      setIsCheckingSession(true);
      try {
        const session = await getAdminSession();
        if (!session?.isAdmin) {
          router.replace('/admin/login');
          return;
        }

        // Now that we have a server session, sign in to Firebase client-side
        if (auth && (!auth.currentUser || auth.currentUser.email !== 'admin@whispr.com')) {
          await signInWithEmailAndPassword(auth, 'admin@whispr.com', 'password123');
        }
        setIsAdmin(true);
      } catch (e: any) {
        console.error("Admin auth check failed:", e);
        setError("Your session is invalid. Please sign out and sign back in.");
        setIsAdmin(false);
      } finally {
        setIsCheckingSession(false);
      }
    }

    if (auth) {
      checkAndSignInAdmin();
    }
  }, [auth, router]);

  const isLoading = isCheckingSession || isUserLoading;

  if (isLoading) {
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
    );
  }

  if (isAdmin && user) {
    return (
      <>
        <AdminHeader />
        <main className="container mx-auto p-4">
          <Dashboard />
        </main>
      </>
    );
  }

  // Fallback case, should be handled by the redirect in useEffect
  return null;
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
