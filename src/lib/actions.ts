
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { classifyWhisper } from '@/ai/flows/classify-whisper-messages';
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
  createUserWithEmailAndPassword,
  signOut,
  UserCredential,
  User,
} from 'firebase/auth';
import { initializeServerSideFirebase } from '@/firebase/server-init';

async function getDb() {
  const { firestore } = initializeServerSideFirebase();
  return firestore;
}

async function getFirebaseAuth() {
  const { auth } = initializeServerSideFirebase();
  return auth;
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
): Promise<{ error?: string; user?: User; }> {
  const auth = await getFirebaseAuth();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // This action now only handles auth. It returns the user object.
    // The client will handle database checks and the final redirect.
    return { user: userCredential.user };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        // Attempt to create the user if they don't exist
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user };
      } catch (creationError: any) {
        return { error: `Failed to create admin user: ${creationError.message}` };
      }
    }
    console.error('Admin login error:', error);
    return { error: error.message || 'An unexpected authentication error occurred.' };
  }
}

export async function finishAdminLoginAndRedirect(adminId: string, email: string) {
  const session = {
    adminId,
    email,
    loggedInAt: Date.now(),
  };

  cookies().set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  });

  // Revalidate and redirect
  revalidatePath('/admin/dashboard', 'layout');
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
  const auth = await getFirebaseAuth();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
  cookies().delete(ADMIN_SESSION_COOKIE);
  redirect('/admin/login');
}

async function verifyAdminAndLogAction(
  targetId: string,
  type: AdminAction['type'],
  details: Record<string, any>
) {
  const session = await getAdminSession();
  if (!session) throw new Error('Unauthorized');
  const db = await getDb();

  const action: Omit<AdminAction, 'actionId' | 'id'> = {
    adminId: session.adminId,
    targetId,
    type,
    timestamp: new Date().toISOString(),
    details,
  };
  await addDoc(collection(db, 'adminActions'), action);
}

export async function getAllPostsForAdmin(): Promise<Post[]> {
  const session = await getAdminSession();
  if (!session) return [];
  
  const db = await getDb();
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));

  const querySnapshot = await getDocs(q);
  const posts: Post[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Convert Firestore Timestamp to ISO string if it exists
    const createdAt = (data.createdAt as any)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : data.createdAt;
    posts.push({ 
        postId: doc.id, 
        id: doc.id,
        ...data,
        createdAt,
    } as Post);
  });
  return posts;
}

export async function getAdminActions(): Promise<AdminAction[]> {
    const session = await getAdminSession();
    if (!session) return [];

  const db = await getDb();
  const actionsRef = collection(db, 'adminActions');
  const q = query(actionsRef, orderBy('timestamp', 'desc'), limit(50));

  const querySnapshot = await getDocs(q);
  const actions: AdminAction[] = [];
  querySnapshot.forEach((doc) => {
    actions.push({ actionId: doc.id, id: doc.id, ...doc.data() } as AdminAction);
  });
  return actions;
}

export async function updatePostLabel(postId: string, newLabel: AILabel) {
  try {
    const db = await getDb();
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) return { error: 'Post not found' };

    await verifyAdminAndLogAction(postId, 're-label', {
      from: postSnap.data().aiLabel,
      to: newLabel,
    });

    await updateDoc(postRef, { aiLabel: newLabel });
    revalidatePath('/admin/dashboard');
    revalidatePath('/feed');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function togglePostVisibility(postId: string) {
    try {
        const db = await getDb();
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) return { error: 'Post not found' };

        const isHidden = postSnap.data().hidden || false;
        await verifyAdminAndLogAction(postId, isHidden ? 'unhide' : 'hide', {
            wasHidden: isHidden,
        });

        await updateDoc(postRef, { hidden: !isHidden });
        revalidatePath('/admin/dashboard');
        revalidatePath('/feed');
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function generateAndSetAdminReply(postId: string) {
  try {
    const db = await getDb();
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return { error: 'Post not found' };

    const postContent = postSnap.data().content;
    
    const { reply } = await generateAdminReply({ message: postContent });
    
    await updateDoc(postRef, { reply: reply });

    await verifyAdminAndLogAction(postId, 'reply', { generatedReply: reply });

    revalidatePath('/admin/dashboard');
    return { success: true, reply };
  } catch (error) {
    console.error('Failed to generate admin reply', error);
    return { error: 'Failed to generate AI reply.' };
  }
}
