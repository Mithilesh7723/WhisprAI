
import { getAdminSession } from '@/lib/actions';
import { redirect } from 'next/navigation';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { adminLogout } from '@/lib/actions';

export const metadata = {
  title: 'Admin Dashboard - Whispr',
};

// This ensures the page is always dynamically rendered to check the session
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  // Data will now be fetched on the client side inside the Dashboard component.

  return (
    // The Firebase provider is needed because the dashboard now fetches its own data on the client.
    <FirebaseClientProvider>
      <div className="min-h-screen bg-secondary">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <AppLogo />
              <span className="text-sm font-medium text-muted-foreground">Admin Dashboard</span>
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
          {/* The dashboard component will now handle its own data fetching. */}
          <Dashboard />
        </main>
      </div>
    </FirebaseClientProvider>
  );
}
