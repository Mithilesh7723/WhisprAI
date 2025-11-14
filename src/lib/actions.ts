
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import { generateAdminReply } from '@/ai/flows/generate-admin-reply';
import type { Post, AdminAction, AILabel } from './types';
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


async function getDb() {
  const { firestore } = initializeServerSideFirebase();
  return firestore;
}

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
  const { auth } = initializeServerSideFirebase();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // This step just authenticates, the client will handle the DB check and redirect.
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error('Admin login process failed:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
         return { error: 'Invalid email or password.' };
    }
    return { error: error.message || 'An unexpected authentication error occurred.' };
  }
  // Let the client handle the rest.
  return {};
}

export async function finishAdminLoginAndRedirect() {
    const { auth } = initializeServerSideFirebase();
    const user = auth.currentUser;

    if (!user) {
        // This should not happen if called after a successful client-side auth.
        redirect('/admin/login');
        return;
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
  const { auth } = initializeServerSideFirebase();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
  cookies().delete(ADMIN_SESSION_COOKIE);
  redirect('/admin/login');
}

export async function verifyAdminAndGetId() {
  const session = await getAdminSession();
  if (!session?.adminId) {
    throw new Error('Unauthorized: No admin session found.');
  }
  return session.adminId;
}


export async function getAllPostsForAdmin(): Promise<Post[]> {
  await verifyAdminAndGetId(); // Ensures only an admin can call this.
  const db = await getDb();
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));

  const querySnapshot = await getDocs(q);
  const posts: Post[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
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
  await verifyAdminAndGetId(); // Ensures only an admin can call this.
  const db = await getDb();
  const actionsRef = collection(db, 'adminActions');
  const q = query(actionsRef, orderBy('timestamp', 'desc'), limit(50));

  const querySnapshot = await getDocs(q);
  const actions: AdminAction[] = [];
  querySnapshot.forEach((doc) => {
    actions.push({ id: doc.id, ...doc.data() } as AdminAction);
  });
  return actions;
}

// Server action just verifies the admin and returns the generated reply.
// The client will be responsible for updating the document.
export async function generateAdminReplyAction(postId: string) {
  try {
    await verifyAdminAndGetId();
    const db = await getDb();
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return { error: 'Post not found' };
    }

    const postContent = postSnap.data().content;
    const { reply } = await generateAdminReply({ message: postContent });

    return { success: true, reply };
  } catch (error: any) {
    console.error('Failed to generate admin reply', error);
    return { error: error.message || 'Failed to generate AI reply.' };
  }
}
