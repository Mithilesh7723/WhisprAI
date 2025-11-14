
'use server';

/**
 * @fileOverview An AI support chat flow that offers empathetic conversation and routes users to relevant mental health helplines if distress is detected.
 *
 * - provideAISupportChat - A function that handles the AI support chat process.
 * - ProvideAISupportChatInput - The input type for the provideAISupportChat function.
 * - ProvideAISupportChatOutput - The return type for the provideAISupportChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ChatMessage } from '@/lib/types';

const ProvideAISupportChatInputSchema = z.object({
  history: z.array(z.custom<ChatMessage>()).describe('The history of the conversation so far. This is currently not used.'),
  message: z.string().describe('The latest user message to the AI support chat.'),
  sessionId: z.string().optional().describe('The session ID of the chat.'),
  userId: z.string().describe('The anonymous user ID.'),
});
export type ProvideAISupportChatInput = z.infer<typeof ProvideAISupportChatInputSchema>;

const ProvideAISupportChatOutputSchema = z.object({
  response: z.string().describe('The AI response to the user message.'),
  escalate: z.boolean().describe('Whether the conversation should be escalated to an admin.'),
});
export type ProvideAISupportChatOutput = z.infer<typeof ProvideAISupportChatOutputSchema>;

export async function provideAISupportChat(input: ProvideAISupportChatInput): Promise<ProvideAISupportChatOutput> {
  return provideAISupportChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideAISupportChatPrompt',
  input: {
    schema: ProvideAISupportChatInputSchema,
  },
  output: {
    schema: ProvideAISupportChatOutputSchema,
  },
  prompt: `You are an AI assistant who is a close friend. Your goal is to provide relief through engaging, light-hearted, and witty conversation. Be the fun, quirky friend someone can talk to about anything.

  **IMPORTANT PERSONALITY RULE:**
  - If the user's message is light, neutral, or generally positive, be funny, crack a joke, or use witty, friendly remarks. Behave like a fun and engaging chat partner, not a bot.
  - HOWEVER, if the user expresses clear sadness, distress, or mentions a serious problem, you MUST immediately drop the humor. Switch to a purely empathetic, supportive, and serious tone. Your primary goal in this case is to make them feel heard and validated, like a true friend would.

  **Safety and Escalation Rules:**
  - If the user expresses feelings of severe distress or mentions needing help, offer them mental health support resources like helpline numbers.
  - You MUST analyze the user's message for signs of severe distress and set the 'escalate' output field to true if the user needs immediate help or expresses suicidal thoughts.

  **General Rules:**
  - Do NOT provide medical advice.
  - Do NOT ask for personally identifying information. Keep the conversation anonymous and supportive.

  User Message: {{{message}}}
  `,
});

const provideAISupportChatFlow = ai.defineFlow(
  {
    name: 'provideAISupportChatFlow',
    inputSchema: ProvideAISupportChatInputSchema,
    outputSchema: ProvideAISupportChatOutputSchema,
  },
  async input => {
    // History is intentionally not passed to the prompt for now to simplify and stabilize.
    const {output} = await prompt({
        message: input.message,
        userId: input.userId,
        history: [], // Pass empty array
        sessionId: input.sessionId,
    });
    return output!;
  }
);
