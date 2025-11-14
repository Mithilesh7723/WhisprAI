
'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { adminLogout } from '@/lib/actions';
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
  const auth = useAuth();
  const { user, isUserLoading: isFirebaseUserLoading } = useUser();
  const [isSigningIn, setIsSigningIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function signInAdmin() {
      if (auth && (!auth.currentUser || auth.currentUser.email !== 'admin@whispr.com')) {
        try {
          await signInWithEmailAndPassword(auth, 'admin@whispr.com', 'password123');
        } catch (e: any) {
          console.error("Admin sign-in failed:", e);
          setError("Could not authenticate with Firebase to fetch data. Please check your connection and configuration.");
        } finally {
          setIsSigningIn(false);
        }
      } else {
        setIsSigningIn(false);
      }
    }

    // Only run sign-in if the auth service is available.
    if (auth) {
      signInAdmin();
    }
  }, [auth]);

  // Overall loading state depends on the initial Firebase user check and our specific admin sign-in attempt.
  const isLoading = isFirebaseUserLoading || isSigningIn;

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

  // The user object from useUser() is the source of truth for being logged into Firebase.
  if (user) {
    return (
      <>
        <AdminHeader />
        <main className="container mx-auto p-4">
          <Dashboard />
        </main>
      </>
    );
  }

  // Fallback in case of an unexpected state.
  return (
    <>
      <AdminHeader />
      <main className="container mx-auto p-4">
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Authenticated</AlertTitle>
            <AlertDescription>Could not sign in to view the dashboard. Please try logging out and back in.</AlertDescription>
          </Alert>
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
