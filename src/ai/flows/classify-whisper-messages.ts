'use server';

/**
 * @fileOverview Classifies 'whisper' messages based on emotional content.
 *
 * - classifyWhisper - A function that classifies the message.
 * - ClassifyWhisperInput - The input type for the classifyWhisper function.
 * - ClassifyWhisperOutput - The return type for the classifyWhisper function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyWhisperInputSchema = z.object({
  content: z.string().describe('The content of the whisper message.'),
});
export type ClassifyWhisperInput = z.infer<typeof ClassifyWhisperInputSchema>;

const ClassifyWhisperOutputSchema = z.object({
  aiLabel: z
    .enum(['normal', 'stressed', 'need_help'])
    .describe('The AI-assigned label for the message.'),
  aiConfidence: z.number().describe('The confidence level of the AI label.'),
});
export type ClassifyWhisperOutput = z.infer<typeof ClassifyWhisperOutputSchema>;

export async function classifyWhisper(input: ClassifyWhisperInput): Promise<ClassifyWhisperOutput> {
  return classifyWhisperFlow(input);
}

const classifyWhisperPrompt = ai.definePrompt({
  name: 'classifyWhisperPrompt',
  input: {schema: ClassifyWhisperInputSchema},
  output: {schema: ClassifyWhisperOutputSchema},
  prompt: `You are an AI Guardian classifying anonymous user messages (whispers) based on their emotional content.\n\nClassify the following message as either 'normal', 'stressed', or 'need_help'. Also, provide a confidence level (0-1) for your classification.\n\nMessage: {{{content}}}\n\nOutput your response as a JSON object with 'aiLabel' and 'aiConfidence' fields.\n\nEnsure the aiLabel is one of: normal, stressed, need_help.
`,
});

const classifyWhisperFlow = ai.defineFlow(
  {
    name: 'classifyWhisperFlow',
    inputSchema: ClassifyWhisperInputSchema,
    outputSchema: ClassifyWhisperOutputSchema,
  },
  async input => {
    const {output} = await classifyWhisperPrompt(input);
    return output!;
  }
);
