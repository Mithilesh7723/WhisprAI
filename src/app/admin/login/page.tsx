
'use client';

import React, { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { adminLogin, finishAdminLoginAndRedirect } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { FirebaseClientProvider, useUser, useFirestore } from '@/firebase';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const initialState: { error?: string; } = {
  error: undefined,
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
  const [loginFinalized, setLoginFinalized] = useState(false);


  useEffect(() => {
    const finishLogin = async (user: User) => {
      if (!firestore) return;
      setIsFinishingLogin(true);
      setClientError(null);

      try {
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        
        // Use a getDoc to check for the role. This might fail, and we need to catch it.
        const adminRoleDoc = await getDoc(adminRoleRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: adminRoleRef.path,
                operation: 'get'
            }));
            throw error;
        });

        if (!adminRoleDoc.exists()) {
          // If the role doesn't exist, try to create it. This might also fail.
          await setDoc(adminRoleRef, {
            email: user.email,
            role: 'superadmin',
            createdAt: new Date().toISOString(),
          }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: adminRoleRef.path,
                operation: 'create',
                requestResourceData: { role: 'superadmin' }
            }));
            throw error;
          });
        }
        
        // If all DB operations succeed, finalize the login and redirect.
        await finishAdminLoginAndRedirect();

      } catch (error: any) {
        console.error("Error during login finalization:", error);
        setClientError(error.message || "An error occurred while finalizing login.");
        setIsFinishingLogin(false); // Stop loading on error
        setLoginFinalized(false); // Allow retry
      }
    };

    // This logic runs after a user is authenticated on the client
    if (authUser && !authUser.isAnonymous && !isUserLoading && !loginFinalized) {
      setLoginFinalized(true); // Prevent this from running again for the same auth user
      finishLogin(authUser);
    }
  }, [authUser, isUserLoading, firestore, loginFinalized]);

  const displayError = formState.error || clientError;
  const isLoading = isFinishingLogin || useFormStatus().pending;


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
             <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Finalizing...' : 'Sign In'}
            </Button>
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
