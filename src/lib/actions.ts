
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { initializeServerSideFirebase } from '@/firebase/server-init';
import { Post, AdminAction } from '@/lib/types';


// --- AI Action ---

export async function runAiChat(message: string, userId: string, sessionId: string | undefined) {
    try {
        const aiResult = await provideAISupportChat({
            message,
            userId,
            sessionId: sessionId,
        });
        return {
            response: aiResult.response,
            escalate: aiResult.escalate,
        };
    } catch (error) {
        console.error('AI chat failed:', error);
        return {
            response: "I'm having a little trouble connecting right now. Please try again in a moment.",
            escalate: false,
        };
    }
}


// --- ADMIN ACTIONS ---

const ADMIN_SESSION_COOKIE = 'whispr-admin-session';

export async function adminLogin(
  prevState: any,
  formData: FormData
): Promise<{ error?: string; }> {
  const { auth, firestore } = initializeServerSideFirebase();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
    const adminRoleDoc = await getDoc(adminRoleRef);

    if (!adminRoleDoc.exists()) {
      try {
        await setDoc(adminRoleRef, {
          email: user.email,
          role: 'superadmin',
          createdAt: new Date().toISOString(),
        });
      } catch (dbError: any) {
        console.error(`Failed to create admin role for ${user.uid}:`, dbError);
        return { error: 'Authentication successful, but failed to grant admin permissions. Please check Firestore rules.' };
      }
    }
    
    const session = {
      adminId: user.uid,
      email: user.email,
      loggedInAt: Date.now(),
    };

    cookies().set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

  } catch (error: any) {
    console.error('Admin login process failed:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
         return { error: 'Invalid email or password.' };
    }
    return { error: error.message || 'An unexpected authentication error occurred.' };
  }

  redirect('/admin/dashboard');
}

export async function getAdminSession() {
  const sessionCookie = cookies().get(ADMIN_SESSION_COOKIE);
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function adminLogout() {
  cookies().delete(ADMIN_SESSION_COOKIE);
  redirect('/admin/login');
}

// Server-side data fetching for admin dashboard
// NOTE: These functions can only be called from Server Components

export async function getAllPostsForAdmin(): Promise<Post[]> {
  const { firestore } = initializeServerSideFirebase();
  const postsRef = collection(firestore, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
}

export async function getAdminActions(): Promise<AdminAction[]> {
    const { firestore } = initializeServerSideFirebase();
    const actionsRef = collection(firestore, 'adminActions');
    const q = query(actionsRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    const actions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminAction));
    // Additional client-side sort just to be safe, as Firestore's order-by on timestamps can sometimes be tricky
    return actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
