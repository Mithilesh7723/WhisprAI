'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AppLogo } from '@/components/app-logo';
import { HelplinePanel } from '@/components/helpline-panel';
import { MessageSquareText, MessagesSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/feed')}
                tooltip="Public Feed"
              >
                <Link href="/feed">
                  <MessagesSquare />
                  <span>Feed</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/chat')}
                tooltip="AI Helper Chat"
              >
                <Link href="/chat">
                  <MessageSquareText />
                  <span>AI Helper</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <ScrollArea className="h-64">
             <HelplinePanel />
          </ScrollArea>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
