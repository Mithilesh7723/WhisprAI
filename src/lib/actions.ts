
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import { ChatMessage } from '@/lib/types';
import { initializeServerSideFirebase } from '@/firebase/server-init';
import { signInWithEmailAndPassword } from 'firebase/auth';

// --- AI Action ---

export async function runAiChat(message: string, userId: string, history: ChatMessage[], sessionId: string | undefined) {
    try {
        const aiResult = await provideAISupportChat({
            message,
            userId,
            history,
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

export async function adminLogin(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // These are demo credentials. In a real app, use a secure auth provider.
  const adminEmail = 'admin@whispr.com';
  const adminPassword = 'password123';
  
  if (email !== adminEmail || password !== adminPassword) {
      const errorMessage = 'Invalid email or password.';
      return redirect(`/admin/login?error=${encodeURIComponent(errorMessage)}`);
  }
  
  try {
    const { auth } = initializeServerSideFirebase();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (userCredential.user) {
        const session = {
          adminId: userCredential.user.uid,
          email: userCredential.user.email,
          loggedInAt: Date.now(),
        };

        cookies().set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24, // 1 day
          path: '/',
        });
        
        return redirect('/admin/dashboard');
    } else {
        throw new Error('User authentication failed.');
    }
  } catch (error: any) {
    console.error("Admin login failed:", error);
    let errorMessage = 'An unknown error occurred during login.';
    if (error.code) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errorMessage = 'Invalid email or password.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Could not connect to authentication service. Please check your network connection.';
                break;
            default:
                errorMessage = `An unexpected error occurred: ${error.code}`;
        }
    }
    return redirect(`/admin/login?error=${encodeURIComponent(errorMessage)}`);
  }
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
