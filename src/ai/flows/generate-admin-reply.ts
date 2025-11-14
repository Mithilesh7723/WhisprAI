
'use server';

/**
 * @fileOverview An AI agent for generating supportive feedback to user whispers.
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
  prompt: `You are an empathetic and helpful AI assistant in a mental health support app called Whispr.

  Your goal is to provide a quick, supportive, and non-medical piece of feedback to a user who has just shared a "whisper" (an anonymous post).

  Generate a supportive and validating reply to the following whisper:

  "{{{message}}}"

  The reply should:
  - Acknowledge what the user shared.
  - Be concise, gentle, and easy to understand.
  - Offer words of encouragement and validation.
  - Sound like a caring friend, not a robot or a doctor.
  - **Do not** give medical advice or make diagnoses.
  - **Do not** ask questions. This is a one-time feedback message.
  - If the message seems to indicate severe distress, you can gently suggest using the app's other resources, but do not be alarming.
  - Prioritize user safety and well-being.
  - Start with a gentle opening like "Thank you for sharing that," or "It sounds like a lot is on your mind.".
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
