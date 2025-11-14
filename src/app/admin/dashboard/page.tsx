
import { getAdminSession, getAllPostsForAdmin, getAdminActions } from '@/lib/actions';
import { redirect } from 'next/navigation';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
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

  // Data is now fetched on the server, where authentication is guaranteed.
  const [posts, actions] = await Promise.all([
    getAllPostsForAdmin(),
    getAdminActions()
  ]);

  return (
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
        {/* Pass the server-fetched data down to the component */}
        <Dashboard posts={posts} actions={actions} />
      </main>
    </div>
  );
}
