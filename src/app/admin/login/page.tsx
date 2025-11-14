
'use client';

import React, { useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { adminLogin, finishAdminLoginAndRedirect } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { FirebaseClientProvider, useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing In...' : 'Sign In'}
    </Button>
  );
}

function AdminLoginContent() {
  const [state, formAction] = useActionState(adminLogin, { error: undefined });
  const [isFinishingLogin, setIsFinishingLogin] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    async function finishLogin() {
      if (state?.success && state.user && firestore) {
        setIsFinishingLogin(true);
        const { uid, email } = state.user;
        const adminRoleRef = doc(firestore, 'roles_admin', uid);

        try {
          const adminRoleDoc = await getDoc(adminRoleRef).catch(error => {
             errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: adminRoleRef.path,
                operation: 'get',
              })
             );
             throw error; // Re-throw to be caught by the outer try-catch
          });

          if (!adminRoleDoc.exists()) {
            const newRole = { 
                email: email,
                role: 'superadmin',
                createdAt: new Date().toISOString()
            };
            // Use .catch for non-blocking error handling
            setDoc(adminRoleRef, newRole).catch(error => {
                errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: adminRoleRef.path,
                    operation: 'create',
                    requestResourceData: newRole
                })
                );
                // We don't need to re-throw here as the emitter handles it.
                // But we should stop the redirect and show a toast.
                toast({
                    variant: "destructive",
                    title: "Role Creation Failed",
                    description: "Could not create the admin role. Check console for details.",
                });
                setIsFinishingLogin(false);
            });
            // Assuming optimistic update, we proceed to redirect.
            // If the setDoc fails, the user will see an error but might be redirected.
            // A more robust solution might wait for a success callback.
          }
          
          await finishAdminLoginAndRedirect();

        } catch (error) {
          // This will catch the re-thrown error from getDoc or other synchronous errors.
          console.error("Failed to finish admin login:", error);
           toast({
            variant: "destructive",
            title: "Login Finalization Failed",
            description: "Could not verify or create admin role. Check permissions.",
          });
          setIsFinishingLogin(false);
        }
      }
    }
    finishLogin();
  }, [state, firestore, toast]);

  if (isFinishingLogin) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Finalizing login, please wait...</p>
        </div>
    )
  }

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
             <div className="space-y-2 rounded-md border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Demo credentials are pre-filled:</p>
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


export default function AdminLoginPage() {
    return (
        <FirebaseClientProvider>
            <AdminLoginContent />
        </FirebaseClientProvider>
    )
}
