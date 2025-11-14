'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { classifyWhisper } from '@/ai/flows/classify-whisper-messages';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import { generateAdminReply } from '@/ai/flows/generate-admin-reply';
import type { Post, AdminAction, AILabel, ChatMessage } from './types';
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  setDoc,
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

// --- USER ACTIONS ---

export async function getPosts(filter?: AILabel) {
  const db = await getDb();
  const postsRef = collection(db, 'posts');
  const q = filter
    ? query(
        postsRef,
        where('hidden', '!=', true),
        where('aiLabel', '==', filter),
        orderBy('hidden'),
        orderBy('createdAt', 'desc')
      )
    : query(
        postsRef,
        where('hidden', '!=', true),
        orderBy('hidden'),
        orderBy('createdAt', 'desc')
      );

  const querySnapshot = await getDocs(q);
  const posts: Post[] = [];
  querySnapshot.forEach((doc) => {
    posts.push({ postId: doc.id, ...doc.data() } as Post);
  });
  return posts;
}

export async function postWhisper(
  prevState: { error?: string; success?: boolean },
  formData: FormData
) {
  const content = formData.get('content') as string;
  const userId = formData.get('userId') as string;

  if (!content || content.trim().length < 5) {
    return { error: 'Whisper must be at least 5 characters long.' };
  }
  if (!userId) {
    return { error: 'Could not identify user.' };
  }

  try {
    const db = await getDb();
    const classification = await classifyWhisper({ content });
    
    await addDoc(collection(db, 'posts'), {
      userId,
      content,
      createdAt: serverTimestamp(),
      aiLabel: classification.aiLabel,
      aiConfidence: classification.aiConfidence,
      hidden: false,
    });

    revalidatePath('/feed');
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (error) {
    console.error('AI classification or Firestore write failed:', error);
    return { error: 'Could not process your whisper. Please try again.' };
  }
}

export async function sendChatMessage(
  history: ChatMessage[],
  message: string,
  userId: string
) {
  try {
    const db = await getDb();
    // Check for an existing chat session
    const chatQuery = query(collection(db, 'aiChats'), where('userId', '==', userId), limit(1));
    const querySnapshot = await getDocs(chatQuery);
    let sessionId: string | undefined;
    let chatDocRef;

    if (querySnapshot.empty) {
        // Create new chat
        chatDocRef = doc(collection(db, 'aiChats'));
        sessionId = chatDocRef.id;
    } else {
        // Use existing chat
        chatDocRef = querySnapshot.docs[0].ref;
        sessionId = chatDocRef.id;
    }

    const aiResult = await provideAISupportChat({
      message,
      userId,
      sessionId: sessionId,
    });

    const userMessage: ChatMessage = {
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    };
    
    const aiMessage: ChatMessage = {
      sender: 'ai',
      text: aiResult.response,
      timestamp: new Date().toISOString(),
    };

    // The full history is now passed from the client, so we just use it directly
    const updatedMessages = [...history, aiMessage];
    
    await setDoc(chatDocRef, {
        userId: userId,
        messages: updatedMessages,
        escalated: aiResult.escalate,
        lastUpdatedAt: serverTimestamp()
    }, { merge: true });

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
  prevState: { error?: string },
  formData: FormData
) {
  const auth = await getFirebaseAuth();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // In a real app, you'd verify if the user has an admin role in your database.
    // For this demo, any successful login is considered an admin.
    const db = await getDb();
    const adminRoleDoc = await getDoc(doc(db, 'roles_admin', userCredential.user.uid));

    if (!adminRoleDoc.exists()) {
        throw new Error("User does not have admin privileges.");
    }

    const session = { 
        adminId: userCredential.user.uid, 
        email: userCredential.user.email,
        loggedInAt: Date.now() 
    };

    cookies().set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
  } catch (error: any) {
    let errorMessage = 'Invalid email or password.';
    if (error.message.includes('admin')) {
        errorMessage = error.message;
    }
    console.error("Admin login failed:", error);
    return { error: errorMessage };
  }
  redirect('/admin/dashboard');
}

export async function getAdminSession() {
  const sessionCookie = cookies().get(ADMIN_SESSION_COOKIE);
  if (!sessionCookie) return null;
  try {
    // Here you might want to verify the token with Firebase Admin SDK in a real backend
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
  const db = await getDb();
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));

  const querySnapshot = await getDocs(q);
  const posts: Post[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Convert Firestore Timestamp to ISO string
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    posts.push({ 
        postId: doc.id, 
        ...data,
        createdAt,
    } as Post);
  });
  return posts;
}

export async function getAdminActions(): Promise<AdminAction[]> {
  const db = await getDb();
  const actionsRef = collection(db, 'adminActions');
  const q = query(actionsRef, orderBy('timestamp', 'desc'), limit(50));

  const querySnapshot = await getDocs(q);
  const actions: AdminAction[] = [];
  querySnapshot.forEach((doc) => {
    actions.push({ actionId: doc.id, ...doc.data() } as AdminAction);
  });
  return actions;
}

export async function updatePostLabel(postId: string, newLabel: AILabel) {
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
}

export async function togglePostVisibility(postId: string) {
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
}

export async function generateAndSetAdminReply(postId: string) {
  const db = await getDb();
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return { error: 'Post not found' };

  const postContent = postSnap.data().content;
  try {
    const { reply } = await generateAdminReply({ message: postContent });
    
    await updateDoc(postRef, { reply: reply });

    await verifyAdminAndLogAction(postId, 'reply', { generatedReply: reply });

    revalidatePath('/admin/dashboard');
    return { success: true, reply };
  } catch (error)
  {
    console.error('Failed to generate admin reply', error);
    return { error: 'Failed to generate AI reply.' };
  }
}
