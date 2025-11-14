'use client';

import { AdminAction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Bot, Eye, EyeOff, Tag } from 'lucide-react';

const actionIcons: Record<AdminAction['type'], React.ReactNode> = {
  're-label': <Tag className="h-4 w-4" />,
  hide: <EyeOff className="h-4 w-4" />,
  unhide: <Eye className="h-4 w-4" />,
  reply: <Bot className="h-4 w-4" />,
};

function getActionDescription(action: AdminAction): string {
    switch(action.type) {
        case 're-label':
            return `Changed label from "${action.details.from}" to "${action.details.to}".`;
        case 'hide':
            return 'Hid the post from public view.';
        case 'unhide':
            return 'Made the post public again.';
        case 'reply':
            return `Generated an AI reply.`;
        default:
            return 'Performed an action.';
    }
}


export function ActionLog({ actions }: { actions: AdminAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Action Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh]">
          <div className="space-y-4">
            {actions.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                    <p>No admin actions recorded yet.</p>
                </div>
            ) : actions.map((action) => (
              <div
                key={action.actionId}
                className="flex items-start gap-4 rounded-md border p-4"
              >
                <span className="mt-1 text-muted-foreground">
                  {actionIcons[action.type]}
                </span>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      <Badge variant="secondary" className="mr-2 capitalize">{action.type}</Badge>
                      on Post ID: <span className="font-mono text-sm">{action.targetId}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(action.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getActionDescription(action)}
                  </p>
                   <p className="text-xs text-muted-foreground mt-2">
                    by Admin: <span className="font-mono">{action.adminId}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
