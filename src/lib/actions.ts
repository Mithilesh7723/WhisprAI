
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import { ChatMessage } from '@/lib/types';

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

  // Hardcoded credentials check
  const aT = 'admin@whispr.com';
  const pT = 'password123';

  if (email === aT && password === pT) {
    const session = {
      adminId: 'hardcoded_admin',
      email: email,
      loggedInAt: Date.now(),
    };

    cookies().set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    
    redirect('/admin/dashboard');

  } else {
    const errorMessage = 'Invalid email or password.';
    redirect(`/admin/login?error=${encodeURIComponent(errorMessage)}`);
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
