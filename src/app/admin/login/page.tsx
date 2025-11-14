'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { adminLogin } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing In...' : 'Sign In'}
    </Button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(adminLogin, { error: undefined });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="mb-8">
        <AppLogo />
      </div>
      <Card className="w-full max-w-sm">
        <form action={formAction}>
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state?.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
             <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Demo credentials:</p>
                <p className="text-sm font-mono">Email: admin@whispr.com</p>
                <p className="text-sm font-mono">Password: password123</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
                defaultValue="admin@whispr.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required defaultValue="password123"/>
            </div>
          </CardContent>
          <CardFooter>
            <LoginButton />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
