
# Whispr: A Safe Space for Anonymous Thoughts

## 1. Project Overview

**Whispr** is a web application designed to be a safe, anonymous, and supportive space for individuals to share their thoughts and feelings without fear of judgment. It combines the community aspect of an anonymous feed with the personalized support of an intelligent AI assistant, creating a unique environment for mental and emotional well-being.

The core mission of Whispr is to provide a platform where users can:
- **Share Freely**: Post anonymous messages, or "whispers," to a public feed.
- **Feel Understood**: Have their whispers gently analyzed by an AI Guardian for emotional tone.
- **Find Support**: Engage in empathetic conversations with a friendly AI Helper.
- **Access Help**: Easily find professional helplines in moments of crisis.

This application serves as a proof-of-concept for how modern web and AI technologies can be integrated to build a responsible and empathetic mental health support tool.

---

## 2. Core Features

### 2.1. Anonymous "Whisper" Feed
Users can post anonymous messages to a public, real-time feed. This allows for a sense of community and shared experience, reminding users that they are not alone in their feelings.

### 2.2. AI Guardian
Every whisper posted is automatically classified by an AI model called the "AI Guardian." This model assesses the emotional content of the message and assigns one of three labels:
- **`normal`**: For everyday thoughts and feelings.
- **`stressed`**: For messages indicating stress or anxiety.
- **`need_help`**: For messages that suggest significant distress.

This classification system helps in content moderation and allows the platform to subtly identify users who might need more support.

### 2.3. AI Helper Chat
A one-on-one chat interface where users can talk to an empathetic AI assistant. The AI Helper is designed to be a friendly, engaging, and witty conversationalist. However, it is also programmed to detect signs of sadness or distress and immediately switch to a more serious and supportive tone, providing a safe space for users to feel heard.

### 2.4. Admin Dashboard
A secure, password-protected dashboard for moderators. Admins can:
- **View all whispers** in a filterable and sortable data table.
- **Perform moderation actions**: Hide sensitive posts, correct AI-assigned labels, and generate AI-powered supportive replies.
- **Monitor activity** through a detailed log of all admin actions.

### 2.5. Helpline Resources
A dedicated, easily accessible panel that provides a list of Indian mental health helplines, ensuring users can find professional support when needed.

---

## 3. Technical Architecture & Tech Stack

Whispr is built on a modern, serverless architecture leveraging the strengths of Next.js for the frontend and Firebase for the backend.

- **Frontend**: **Next.js** with the App Router, **React**, and **TypeScript**.
- **UI/Styling**: **Tailwind CSS** with **ShadCN UI** for a clean, modern, and accessible component library.
- **Backend & Database**: **Firebase**, specifically:
  - **Firebase Authentication**: For seamless and secure anonymous user sign-in.
  - **Cloud Firestore**: A NoSQL database used to store all application data (whispers, chat sessions, admin roles).
  - **Firestore Security Rules**: To protect data and enforce access control.
- **Generative AI**: **Google's Genkit** integrated with **Gemini models** to power all AI features, from message classification to empathetic chat responses.

---

## 4. Application Flows & Logic

### 4.1. User Authentication Flow

- **Anonymous Sign-In**: On first visit, the app automatically creates an anonymous user account via Firebase Authentication. This `userId` is persisted locally, allowing users to maintain their identity across sessions without providing any personal information.
- **Session Management**: The user's authentication state is managed globally through a React Context provider, ensuring that components can reactively access the user's status.

### 4.2. Data Models (Firestore Collections)

- `/posts/{postId}`: Stores each individual whisper, including its content, `userId`, timestamp, and AI-assigned label.
- `/aiChats/{aiChatId}`: Stores conversation histories between a user and the AI Helper. Each document contains the `userId` and an array of message objects.
- `/roles_admin/{adminId}`: A collection used for access control. A document's existence in this collection signifies that the user with the corresponding `uid` is an administrator.
- `/adminActions/{adminActionId}`: Logs every moderation action performed by an admin, creating an audit trail.

### 4.3. AI & Generative Flows (Genkit)

Whispr utilizes three distinct AI flows, each powered by Genkit and the Gemini model.

#### a) `classifyWhisperFlow`
- **Trigger**: A user submits a new whisper.
- **Purpose**: To analyze the emotional content of the whisper.
- **Process**:
  1. The user's message content is sent to this flow.
  2. A prompt instructs the Gemini model to act as an "AI Guardian" and classify the message into one of three categories: `normal`, `stressed`, or `need_help`.
  3. The model returns a JSON object containing the `aiLabel` and a `aiConfidence` score.
  4. This data is saved along with the whisper in the `/posts` collection.

#### b) `generateAdminReplyFlow`
- **Trigger**: An admin clicks the "Generate AI Reply" button for a whisper in the dashboard, or automatically after a user submits a whisper.
- **Purpose**: To create a quick, supportive, and non-medical reply to a user's whisper.
- **Process**:
  1. The content of the selected whisper is sent to the flow.
  2. The prompt instructs the model to act as an empathetic friend and generate a concise, validating message. It is explicitly told *not* to give medical advice.
  3. The generated reply is then displayed to the user in a dialog or attached to the post for the admin's review.

#### c) `provideAISupportChatFlow`
- **Trigger**: A user sends a message in the AI Helper chat.
- **Purpose**: To provide an engaging, friendly, and supportive chat experience.
- **Process**:
  1. The user's message is sent to the flow.
  2. A sophisticated prompt defines a dual personality for the AI:
     - **Default Mode**: Witty, funny, and friendly, like a close friend.
     - **Empathetic Mode**: If the user's message indicates sadness or distress, the AI immediately drops the humor and adopts a serious, supportive, and validating tone.
  3. The prompt also includes a rule for **escalation**. If the AI detects severe distress or a crisis, it sets an `escalate` boolean flag to `true`.
  4. The AI's generated text response and the `escalate` flag are returned. If `escalate` is true, the UI displays the helpline resources panel.

### 4.4. Admin & Moderation Flow

- **Login**: Admins log in via a dedicated page with hardcoded credentials (for this demo). A secure, HTTP-only cookie is set to manage the admin session.
- **Dashboard Access**: The admin dashboard is protected. It checks for the session cookie and verifies the admin's role against the `/roles_admin` collection using Firestore Security Rules.
- **Data-Table**: The dashboard presents all posts in a table, showing content, AI labels, and timestamps. Admins can filter by content or AI label.
- **Moderation Actions**: From the table, an admin can:
  - **Re-label a post**: If the AI Guardian's classification seems incorrect.
  - **Hide/Unhide a post**: To control content visibility on the public feed.
- **Logging**: Every action taken by an admin is recorded in the `/adminActions` collection, ensuring accountability.

---

This README provides a blueprint for understanding the Whispr application. It can be used as a foundation for creating presentations, onboarding new developers, or planning future features.
