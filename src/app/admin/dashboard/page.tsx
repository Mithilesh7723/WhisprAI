
import { getAdminSession, getAllPostsForAdmin, getAdminActions, adminLogout } from '@/lib/actions';
import { redirect } from 'next/navigation';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata = {
  title: 'Admin Dashboard - Whispr',
};

// This ensures the page is always dynamically rendered to get fresh data
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch data on the server. The components will be client components
  // but they will receive this initial data as props.
  const posts = await getAllPostsForAdmin();
  const actions = await getAdminActions();

  return (
    // The Firebase provider is needed because the row actions are client components that use Firestore
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
            <Dashboard posts={posts} actions={actions} />
        </main>
        </div>
    </FirebaseClientProvider>
  );
}
