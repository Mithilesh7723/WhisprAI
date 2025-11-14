'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { classifyWhisper } from '@/ai/flows/classify-whisper-messages';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import { generateAdminReply } from '@/ai/flows/generate-admin-reply';
import type { Post, AdminAction, AILabel, ChatMessage, AIChat } from './types';
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
  limit,
  setDoc,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { initializeServerSideFirebase } from '@/firebase/server-init';
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

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
    
    addDocumentNonBlocking(collection(db, 'posts'), {
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
    const chatQuery = query(collection(db, 'aiChats'), where('userId', '==', userId), limit(1));
    const querySnapshot = await getDocs(chatQuery);
    let sessionId: string | undefined;
    let chatDocRef;

    if (querySnapshot.empty) {
        chatDocRef = doc(collection(db, 'aiChats'));
        sessionId = chatDocRef.id;
    } else {
        chatDocRef = querySnapshot.docs[0].ref;
        sessionId = chatDocRef.id;
    }

    const aiResult = await provideAISupportChat({
      message,
      userId,
      sessionId: sessionId,
    });
    
    const aiMessage: ChatMessage = {
      sender: 'ai',
      text: aiResult.response,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...history, aiMessage];
    
    setDocumentNonBlocking(chatDocRef, {
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
  const db = await getDb();

  try {
     // Special handling for demo user
    if (email === 'admin@whispr.com') {
      try {
        // Attempt to create the user. If they already exist, this will fail, and we'll sign them in.
        const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
        const adminId = newUserCredential.user.uid;
        // Set admin role in Firestore
        await setDoc(doc(db, 'roles_admin', adminId), { 
          email: email,
          role: 'superadmin',
          createdAt: serverTimestamp() 
        });
      } catch (error: any) {
        // If user already exists, that's fine, we'll just log them in.
        if (error.code !== 'auth/email-already-in-use') {
          // For other creation errors, we should fail.
          console.error("Admin user creation failed:", error);
          return { error: 'Failed to set up admin user.' };
        }
      }
    }

    // Sign in the user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Verify admin role
    const adminRoleDoc = await getDoc(doc(db, 'roles_admin', userCredential.user.uid));
    if (!adminRoleDoc.exists()) {
        await signOut(auth); // Sign out if not an admin
        throw new Error("User does not have admin privileges.");
    }

    // Set session cookie
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
    if (error.message.includes('admin privileges')) {
        errorMessage = error.message;
    }
    console.error("Admin login failed:", error.code, error.message);
    return { error: errorMessage };
  }

  // Redirect on success
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
  await addDocumentNonBlocking(collection(db, 'adminActions'), action);
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
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
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

    updateDocumentNonBlocking(postRef, { aiLabel: newLabel });
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

        updateDocumentNonBlocking(postRef, { hidden: !isHidden });
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
    
    updateDocumentNonBlocking(postRef, { reply: reply });

    await verifyAdminAndLogAction(postId, 'reply', { generatedReply: reply });

    revalidatePath('/admin/dashboard');
    return { success: true, reply };
  } catch (error) {
    console.error('Failed to generate admin reply', error);
    return { error: 'Failed to generate AI reply.' };
  }
}
