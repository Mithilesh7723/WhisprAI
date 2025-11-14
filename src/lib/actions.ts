
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import { generateAdminReply } from '@/ai/flows/generate-admin-reply';
import type { Post, AdminAction } from './types';
import {
  getFirestore,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  updateDoc,
  limit,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { initializeServerSideFirebase } from '@/firebase/server-init';


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

    // After successful auth, check/create the admin role doc in Firestore
    const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
    const adminRoleDoc = await getDoc(adminRoleRef);

    if (!adminRoleDoc.exists()) {
      // This is a first-time admin login, create the role document.
      // This might fail if security rules are restrictive, which is a valid security posture.
      try {
        await setDoc(adminRoleRef, {
          email: user.email,
          role: 'superadmin',
          createdAt: new Date().toISOString(),
        });
      } catch (dbError: any) {
        console.error(`Failed to create admin role for ${user.uid}:`, dbError);
        // This is a critical error. The user is authenticated but cannot be granted admin rights in the DB.
        // We must not set the session cookie.
        return { error: 'Authentication successful, but failed to grant admin permissions. Please check Firestore rules.' };
      }
    }
    
    // Auth and DB checks passed, set the session cookie.
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

  // If all steps are successful, redirect to the dashboard.
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
  // We don't need to interact with Firebase Auth state on the server for logout.
  // Simply clearing the cookie is enough to invalidate the session.
  cookies().delete(ADMIN_SESSION_COOKIE);
  redirect('/admin/login');
}


async function getDbForAdmin() {
  const session = await getAdminSession();
  if (!session?.adminId) {
    throw new Error('Unauthorized: No admin session found or session is invalid.');
  }
  // We can trust the session, so we can initialize Firebase on the server.
  // Security rules will still be the ultimate authority.
  const { firestore } = initializeServerSideFirebase();
  return firestore;
}


export async function getAllPostsForAdmin(): Promise<Post[]> {
  const db = await getDbForAdmin();
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));

  const querySnapshot = await getDocs(q);
  const posts: Post[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Safely convert Firestore Timestamp to ISO string
    const createdAt = (data.createdAt as any)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : data.createdAt;
    posts.push({ 
        id: doc.id,
        ...data,
        createdAt,
    } as Post);
  });
  return posts;
}

export async function getAdminActions(): Promise<AdminAction[]> {
  const db = await getDbForAdmin();
  const actionsRef = collection(db, 'adminActions');
  const q = query(actionsRef, orderBy('timestamp', 'desc'), limit(50));

  const querySnapshot = await getDocs(q);
  const actions: AdminAction[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const timestamp = (data.timestamp as any)?.toDate ? (data.timestamp as Timestamp).toDate().toISOString() : data.timestamp;
    actions.push({ id: doc.id, ...data, timestamp } as AdminAction);
  });
  return actions;
}

export async function generateAdminReplyAction(postId: string) {
  try {
    const db = await getDbForAdmin();
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return { error: 'Post not found' };
    }

    const postContent = postSnap.data().content;
    const { reply } = await generateAdminReply({ message: postContent });
    
    await updateDoc(postRef, { reply: reply });

    revalidatePath('/admin/dashboard');
    return { success: true, reply };
  } catch (error: any) {
    console.error('Failed to generate admin reply', error);
    return { error: error.message || 'Failed to generate AI reply.' };
  }
}
