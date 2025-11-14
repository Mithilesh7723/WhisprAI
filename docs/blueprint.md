# **App Name**: Whispr

## Core Features:

- Anonymous Message Posting: Allows users to post short, anonymous messages to a public feed.
- Realtime Feed: Displays all whispers in a realtime feed, showing the text, timestamp, and AI label.
- AI Guardian Labeling: Uses an AI tool to analyze messages and assign labels (normal, stressed, need_help) with a confidence level. Stores the label with the message.
- Helpline Panel: Displays mental-health support numbers and crisis helplines accessible from all pages.
- AI Support Chat: Offers an AI chat interface that provides empathetic emotional support. Routes users to helplines if distress is detected. Does NOT give medical advice.
- Admin Dashboard: Provides a secure admin login with access to a dashboard displaying all posts grouped by AI Guardian labels. Allows filtering, replying, hiding/removing content, updating labels, and viewing an audit log of admin actions.
- Data Persistence: Store posts, AI chats, admins and admin actions on Firestore

## Style Guidelines:

- Primary color: Soft lavender (#E6E6FA) to promote calmness and serenity.
- Background color: Very light gray (#F5F5F5) for a clean, non-intrusive backdrop.
- Accent color: Pale blue (#ADD8E6) to highlight important elements and actions without overwhelming the user.
- Body and headline font: 'PT Sans', a humanist sans-serif that combines a modern look with a little warmth.
- Use simple, minimalist icons for navigation and to represent message categories.
- Clean, simple layouts with plenty of whitespace to reduce clutter and promote a sense of calm. Mobile-first responsive design.
- Subtle, gentle animations for transitions and feedback, avoiding any jarring or distracting effects.