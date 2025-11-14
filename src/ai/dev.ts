import { config } from 'dotenv';
config();

import '@/ai/flows/classify-whisper-messages.ts';
import '@/ai/flows/generate-admin-reply.ts';
import '@/ai/flows/provide-ai-support-chat.ts';