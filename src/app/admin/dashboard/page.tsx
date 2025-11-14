
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminSession, adminLogout } from '@/lib/actions';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { FirebaseClientProvider } from '@/firebase';

export default function AdminDashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const currentSession = await getAdminSession();
      if (!currentSession) {
        router.push('/admin/login');
      } else {
        setSession(currentSession);
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FirebaseClientProvider>
      <div className="min-h-screen bg-secondary">
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
        <main className="container mx-auto p-4">
          <Dashboard />
        </main>
      </div>
    </FirebaseClientProvider>
  );
}
