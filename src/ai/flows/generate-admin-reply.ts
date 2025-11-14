'use server';

/**
 * @fileOverview An AI agent for generating admin replies to user messages.
 *
 * - generateAdminReply - A function that generates an AI-suggested reply to a given user message.
 * - GenerateAdminReplyInput - The input type for the generateAdminReply function.
 * - GenerateAdminReplyOutput - The return type for the generateAdminReply function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdminReplyInputSchema = z.object({
  message: z.string().describe('The user message to generate a reply for.'),
});
export type GenerateAdminReplyInput = z.infer<typeof GenerateAdminReplyInputSchema>;

const GenerateAdminReplyOutputSchema = z.object({
  reply: z.string().describe('The AI-generated reply to the user message.'),
});
export type GenerateAdminReplyOutput = z.infer<typeof GenerateAdminReplyOutputSchema>;

export async function generateAdminReply(input: GenerateAdminReplyInput): Promise<GenerateAdminReplyOutput> {
  return generateAdminReplyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdminReplyPrompt',
  input: {schema: GenerateAdminReplyInputSchema},
  output: {schema: GenerateAdminReplyOutputSchema},
  prompt: `You are an empathetic and helpful AI assistant tasked with generating replies to user messages in a mental health support app called Whispr.

  The goal is to provide quick, supportive, and non-medical advice to users in distress.

  Generate a reply to the following message:

  {{{message}}}

  The reply should:
  - Be concise and easy to understand.
  - Offer words of encouragement and support.
  - Avoid giving medical advice or making diagnoses.
  - Suggest seeking professional help or contacting a crisis hotline if the message indicates severe distress.
  - Prioritize user safety and well-being.
  `,
});

const generateAdminReplyFlow = ai.defineFlow(
  {
    name: 'generateAdminReplyFlow',
    inputSchema: GenerateAdminReplyInputSchema,
    outputSchema: GenerateAdminReplyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
