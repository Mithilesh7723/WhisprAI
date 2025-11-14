
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
): Promise<{ error?: string }> {
  const auth = await getFirebaseAuth();
  const db = await getDb();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    const user = userCredential.user;
    const adminRoleRef = doc(db, 'roles_admin', user.uid);
    const adminRoleDoc = await getDoc(adminRoleRef);

    if (!adminRoleDoc.exists()) {
       await setDoc(adminRoleRef, {
        email: user.email,
        role: 'superadmin',
        createdAt: new Date().toISOString(),
      });
    }

    // Set cookie
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

  // Redirect on success
  revalidatePath('/admin/dashboard');
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

export async function verifyAdminAndGetId() {
  const session = await getAdminSession();
  if (!session?.adminId) {
    throw new Error('Unauthorized: No admin session found.');
  }
  return session.adminId;
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

export async function updatePostLabel(postId: string, label: AILabel) {
  const adminId = await verifyAdminAndGetId();
  const db = await getDb();

  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error('Post not found');

  await updateDoc(postRef, { aiLabel: label });

  const actionsRef = collection(db, 'adminActions');
  await addDoc(actionsRef, {
    adminId,
    targetId: postId,
    type: 're-label',
    timestamp: new Date().toISOString(),
    details: { from: postSnap.data().aiLabel, to: label },
  });

  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function togglePostVisibility(postId: string) {
  const adminId = await verifyAdminAndGetId();
  const db = await getDb();

  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error('Post not found');

  const isHidden = postSnap.data().hidden || false;
  await updateDoc(postRef, { hidden: !isHidden });

  const actionsRef = collection(db, 'adminActions');
  await addDoc(actionsRef, {
    adminId,
    targetId: postId,
    type: isHidden ? 'unhide' : 'hide',
    timestamp: new Date().toISOString(),
    details: { wasHidden: isHidden },
  });

  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function generateAndSetAdminReply(postId: string) {
  try {
    const adminId = await verifyAdminAndGetId();
    const db = await getDb();
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return { error: 'Post not found' };

    const postContent = postSnap.data().content;
    
    const { reply } = await generateAdminReply({ message: postContent });

    await updateDoc(postRef, { reply });

    const actionsRef = collection(db, 'adminActions');
    await addDoc(actionsRef, {
        adminId,
        targetId: postId,
        type: 'reply',
        timestamp: new Date().toISOString(),
        details: { generatedReply: reply },
    });
    
    revalidatePath('/admin/dashboard');
    return { success: true, reply };
  } catch (error: any) {
    console.error('Failed to generate admin reply', error);
    return { error: error.message || 'Failed to generate AI reply.' };
  }
}
