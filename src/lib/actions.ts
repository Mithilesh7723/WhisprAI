'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { classifyWhisper } from '@/ai/flows/classify-whisper-messages';
import { provideAISupportChat } from '@/ai/flows/provide-ai-support-chat';
import { generateAdminReply } from '@/ai/flows/generate-admin-reply';
import type { Post, AdminAction, AILabel, ChatMessage } from './types';

// --- MOCK DATABASE ---

let mockPosts: Post[] = [
  {
    postId: '1',
    userId: 'anon_123',
    content: "Feeling a bit down today, but I think I'll be okay. Just needed to get it out.",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    aiLabel: 'normal',
    aiConfidence: 0.9,
  },
  {
    postId: '2',
    userId: 'anon_456',
    content: "The pressure from work is becoming unbearable. I don't know how much more I can take.",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    aiLabel: 'stressed',
    aiConfidence: 0.85,
  },
  {
    postId: '3',
    userId: 'anon_789',
    content: "I feel so empty and alone. Nothing seems to matter anymore and I'm thinking of giving up.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    aiLabel: 'need_help',
    aiConfidence: 0.98,
  },
  {
    postId: '4',
    userId: 'anon_123',
    content: "Just watched a beautiful sunset. It's the small things that make a difference.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    aiLabel: 'normal',
    aiConfidence: 0.99,
  },
];

let mockAdminActions: AdminAction[] = [];

// --- USER ACTIONS ---

export async function getPosts(filter?: AILabel) {
  await new Promise(res => setTimeout(res, 500)); // Simulate network delay
  const posts = mockPosts.filter(p => !p.hidden).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (filter) {
    return posts.filter(p => p.aiLabel === filter);
  }
  return posts;
}

export async function postWhisper(formData: FormData) {
  const content = formData.get('content') as string;
  const userId = formData.get('userId') as string;

  if (!content || content.trim().length < 5) {
    return { error: 'Whisper must be at least 5 characters long.' };
  }
  if (!userId) {
    return { error: 'Could not identify user.' };
  }

  try {
    const classification = await classifyWhisper({ content });
    const newPost: Post = {
      postId: `post_${Date.now()}`,
      userId,
      content,
      createdAt: new Date().toISOString(),
      aiLabel: classification.aiLabel,
      aiConfidence: classification.aiConfidence,
    };
    mockPosts.unshift(newPost);
    revalidatePath('/feed');
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (error) {
    console.error('AI classification failed:', error);
    return { error: 'Could not process your whisper. Please try again.' };
  }
}

export async function sendChatMessage(
  history: ChatMessage[],
  message: string,
  userId: string
) {
  try {
    const aiResult = await provideAISupportChat({
      message,
      userId,
      // The AI flow doesn't have a history param, so we send the latest message.
      // In a real scenario, the flow would be adapted to handle history.
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

  // In a real app, you would verify against a database.
  if (email === 'admin@whispr.com' && password === 'password123') {
    const session = { adminId: 'admin_01', email, loggedInAt: Date.now() };
    cookies().set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    redirect('/admin/dashboard');
  }

  return { error: 'Invalid email or password.' };
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

async function verifyAdminAndLogAction(targetId: string, type: AdminAction['type'], details: Record<string, any>) {
  const session = await getAdminSession();
  if (!session) throw new Error('Unauthorized');
  
  const action: AdminAction = {
    actionId: `action_${Date.now()}`,
    adminId: session.adminId,
    targetId,
    type,
    timestamp: new Date().toISOString(),
    details,
  };
  mockAdminActions.unshift(action);
}

export async function getAllPostsForAdmin() {
  await new Promise(res => setTimeout(res, 500)); // Simulate delay
  return mockPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAdminActions() {
    await new Promise(res => setTimeout(res, 500)); // Simulate delay
    return mockAdminActions;
}

export async function updatePostLabel(postId: string, newLabel: AILabel) {
  const postIndex = mockPosts.findIndex(p => p.postId === postId);
  if (postIndex === -1) return { error: 'Post not found' };

  await verifyAdminAndLogAction(postId, 're-label', { from: mockPosts[postIndex].aiLabel, to: newLabel });

  mockPosts[postIndex].aiLabel = newLabel;
  revalidatePath('/admin/dashboard');
  revalidatePath('/feed');
  return { success: true };
}

export async function togglePostVisibility(postId: string) {
  const postIndex = mockPosts.findIndex(p => p.postId === postId);
  if (postIndex === -1) return { error: 'Post not found' };

  const isHidden = mockPosts[postIndex].hidden || false;
  await verifyAdminAndLogAction(postId, isHidden ? 'unhide' : 'hide', { wasHidden: isHidden });
  
  mockPosts[postIndex].hidden = !isHidden;
  revalidatePath('/admin/dashboard');
  revalidatePath('/feed');
  return { success: true };
}

export async function generateAndSetAdminReply(postId: string) {
    const postIndex = mockPosts.findIndex(p => p.postId === postId);
    if (postIndex === -1) return { error: 'Post not found' };

    const postContent = mockPosts[postIndex].content;
    try {
        const { reply } = await generateAdminReply({ message: postContent });
        mockPosts[postIndex].reply = reply;

        await verifyAdminAndLogAction(postId, 'reply', { generatedReply: reply });

        revalidatePath('/admin/dashboard');
        return { success: true, reply };
    } catch(error) {
        console.error("Failed to generate admin reply", error);
        return { error: 'Failed to generate AI reply.' };
    }
}
