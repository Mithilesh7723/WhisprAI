
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

const ANONYMOUS_ID_KEY = 'whispr-anonymous-id';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAnonymousSignIn(): { user: User | null; anonymousId: string | null; isLoading: boolean } {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up the listener for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && firebaseUser.isAnonymous) {
        // If we get a user and they are anonymous, ensure local ID matches
        if (localStorage.getItem(ANONYMOUS_ID_KEY) !== firebaseUser.uid) {
            localStorage.setItem(ANONYMOUS_ID_KEY, firebaseUser.uid);
        }
        setAnonymousId(firebaseUser.uid);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    // This effect handles the sign-in logic
    if (isLoading) return; // Don't do anything while auth state is being checked

    // Get or create local anonymous ID
    let localId = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (!localId) {
      localId = `anon_${generateUUID()}`;
      localStorage.setItem(ANONYMOUS_ID_KEY, localId);
    }
    setAnonymousId(localId);

    // If there's no user, or the user isn't anonymous, sign in.
    if (!user || !user.isAnonymous) {
      setIsLoading(true);
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
        setIsLoading(false); // Stop loading even on error
      });
    }
  }, [auth, user, isLoading]);

  return { user, anonymousId, isLoading: isLoading || !anonymousId };
}
