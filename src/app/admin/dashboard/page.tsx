
import { getAdminSession, getAllPostsForAdmin, getAdminActions } from '@/lib/actions';
import { redirect } from 'next/navigation';
import { Dashboard } from './components/dashboard';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { adminLogout } from '@/lib/actions';

// This is now a Server Component
export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  
  // This check now happens securely on the server.
  if (!session) {
    redirect('/admin/login');
  }

  // Data is fetched securely on the server.
  const posts = await getAllPostsForAdmin();
  const actions = await getAdminActions();

  return (
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
        {/* The Dashboard component is now a client component that receives data as props */}
        <Dashboard initialPosts={posts} initialActions={actions} />
      </main>
    </div>
  );
}
