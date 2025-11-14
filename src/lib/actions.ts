
'use server';

import 'dotenv/config';
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
  
  // On successful credential check, just redirect to the dashboard.
  // The dashboard will handle its own client-side Firebase login.
  return redirect('/admin/dashboard');
}

export async function adminLogout() {
  // Since there is no server session, just redirect to login.
  // Client-side state will be cleared on page reload.
  redirect('/admin/login');
}
