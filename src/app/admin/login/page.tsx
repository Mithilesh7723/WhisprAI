
'use client';

import React, { useEffect, useState } from 'react';
import { useActionState, useFormStatus } from 'react-dom';
import { adminLogin, finishAdminLoginAndRedirect } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { FirebaseClientProvider, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { User } from 'firebase/auth';

const initialState: { error?: string; user?: User } = {
  error: undefined,
  user: undefined,
};

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing In...' : 'Sign In'}
    </Button>
  );
}

function AdminLoginContent() {
  const [formState, formAction] = useActionState(adminLogin, initialState);
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isFinishingLogin, setIsFinishingLogin] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [loginFinalized, setLoginFinalized] = useState(false); // Guard state

  useEffect(() => {
    const finishLogin = async (userToFinalize: User) => {
      if (!firestore || !userToFinalize.email) {
        setClientError('An unexpected client-side error occurred. Firestore or user email is missing.');
        setIsFinishingLogin(false);
        return;
      }
      setIsFinishingLogin(true);
      setClientError(null);

      const adminRoleRef = doc(firestore, 'roles_admin', userToFinalize.uid);

      try {
        const adminRoleDoc = await getDoc(adminRoleRef).catch((error) => {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: adminRoleRef.path,
              operation: 'get',
            })
          );
          throw error;
        });

        if (!adminRoleDoc.exists()) {
          // Use .catch() for non-blocking error handling with the emitter
          setDoc(adminRoleRef, {
            email: userToFinalize.email,
            role: 'superadmin',
            createdAt: new Date().toISOString(),
          }).catch((error) => {
            errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: adminRoleRef.path,
                operation: 'create',
                requestResourceData: { role: 'superadmin' },
              })
            );
            throw error;
          });
        }
        
        await finishAdminLoginAndRedirect(userToFinalize.uid, userToFinalize.email);

      } catch (error: any) {
        console.error("Error during login finalization:", error);
        if (!(error instanceof FirestorePermissionError)) {
          setClientError(error.message || 'Failed to check or create admin role.');
        }
        setIsFinishingLogin(false);
        setLoginFinalized(false); // Reset guard on error
      }
    };
    
    // This effect runs when the auth state changes on the client
    if (!isUserLoading && authUser && !authUser.isAnonymous && !loginFinalized) {
      setLoginFinalized(true); // Set guard to true immediately
      finishLogin(authUser);
    }
  }, [authUser, isUserLoading, firestore, loginFinalized]);

  const displayError = formState?.error || clientError;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="mb-8">
        <AppLogo />
      </div>
      <Card className="w-full max-w-sm">
        {isFinishingLogin ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Finalizing login, please wait...</p>
          </div>
        ) : (
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
              <CardDescription>
                Enter your credentials to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{displayError}</AlertDescription>
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
        )}
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
