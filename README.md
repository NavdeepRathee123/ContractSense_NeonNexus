# ContractSense

> Know what you're signing.

ContractSense is an AI-powered contract analysis platform built by **NeonNexus** during a 48-hour hackathon sprint. It helps freelancers, founders, and SMBs upload contracts, understand them in plain English, identify risky clauses, generate negotiation-ready suggestions, and optionally route the contract to lawyers for human review.

This repository contains the current frontend application built as a **React 19 + Vite single-page app** with **Firebase** and **Google Gemini** powering authentication, data storage, and AI analysis.

## Problem

Millions of freelancers and small businesses sign contracts without affordable legal guidance. Traditional lawyer reviews are expensive, and generic AI tools often return long summaries without a clear decision.

ContractSense is designed to answer the questions users actually care about:

- What does this contract really mean?
- Which clauses are risky?
- Should I sign, negotiate, or escalate?
- What should I say back?
- When should I bring in a lawyer?

## Solution

ContractSense combines AI analysis with a legal review workflow across three product surfaces:

- **User Portal** for contract upload, AI analysis, negotiation support, and review requests
- **Lawyer Portal** for reviewing contracts, adding annotations, and submitting reports
- **Admin Portal** for platform oversight, verification workflows, blocking controls, and transaction visibility

Core product pillars:

- **Understand**: translate legal language into plain English
- **Analyze**: flag risky clauses with structured reasoning
- **Negotiate**: generate counter-points and suggested wording
- **Verify**: connect users with lawyers for human review

## Key Features

- AI-powered contract upload and analysis
- Contract type detection
- Clause-by-clause risk breakdown
- Plain English summaries for non-lawyers
- Negotiation suggestions and replacement wording
- Outcome simulation for risky clauses
- In-report AI chat for contract-specific questions
- Lawyer marketplace and review workflow
- Lawyer rating and verification logic
- Admin dashboard for users, lawyers, and payments
- Real-time data updates with Firestore
- Google authentication for fast onboarding

## Tech Stack

### Frontend

- **React 19**
- **Vite**
- **TypeScript**
- **Tailwind CSS 4**
- **Motion**
- **Lucide React**
- **Recharts**
- **react-dropzone**
- **clsx** + **tailwind-merge**

### Backend and Infrastructure

- **Firebase Auth** for authentication
- **Cloud Firestore** for real-time data
- **Google Gemini API** via `@google/genai` for analysis and chat
- **Node.js-ready environment** with support for adding an Express backend if needed
- **Cloud Run** for containerized deployment

## How It Works

1. A user signs in with Google.
2. The user uploads a contract for AI analysis.
3. Gemini detects the contract type and generates a structured risk review.
4. The app presents clause-level insights, summaries, and negotiation guidance.
5. The user can ask follow-up questions through the contract-aware AI chat.
6. If needed, the user requests lawyer review.
7. Lawyers review, annotate, and submit their assessment.
8. Admins manage verifications, platform activity, and payment visibility.

## AI Workflow

The current app uses Gemini to support:

- full contract analysis
- contract-aware chat
- lawyer rating assistance
- closest-domain matching for lawyer recommendations
- outcome simulation for contract scenarios

The AI output is structured so the UI can show:

- contract type
- summary
- risk grade
- clause list
- plain English explanations
- risk reasoning
- negotiation counter-points
- suggested replacement wording
- party intelligence

## Project Structure

```text
src/
  App.tsx                     Main SPA application
  main.tsx                    React entry point
  index.css                   Global styles
  firebase.ts                 Firebase initialization and helpers
  services/
    geminiService.ts          Gemini analysis and chat logic

firebase-applet-config.json   Firebase app configuration
firestore.rules               Firestore security rules
vite.config.ts                Vite configuration
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env` file based on `.env.example`.

Expected variables:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

If you are using Vite-only local env access, you may also want to expose:

```env
VITE_gemini_api_key=your_gemini_api_key
```

### 3. Configure Firebase

Update `firebase-applet-config.json` with your Firebase project settings if you are not using the included configuration.

Make sure the following Firebase services are enabled:

- Authentication with Google sign-in
- Cloud Firestore

### 4. Start the development server

```bash
npm run dev
```

The app runs on:

```text
http://localhost:3000
```

## Available Scripts

- `npm run dev` starts the Vite dev server on port `3000`
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs TypeScript type-checking

## Deployment

This project is designed to be deployable as a containerized frontend on **Cloud Run**.

Typical deployment flow:

1. Build the app
2. Serve the production output through your preferred static hosting or container setup
3. Provide Firebase config and Gemini API credentials through environment variables or secret management

## Product Vision

ContractSense is positioned as **AI-first, not AI-only**.

The platform is built around a hybrid workflow:

- AI handles fast first-pass understanding and negotiation support
- Lawyers provide final human review where risk is high
- Admin controls maintain trust, verification, and marketplace quality

## Hackathon Context

- **Team**: NeonNexus
- **Product**: ContractSense
- **Domain**: Generative AI / Legal Tech
- **Format**: 48-hour hackathon build

## Notes

- Some legacy naming in the codebase and metadata may still reflect earlier internal branding from the sprint phase.
- This repository currently centers on the SPA experience and Firebase-backed workflows.
- Payment orchestration and some marketplace flows can be extended further depending on production requirements.

## License

This project was built for hackathon/demo purposes. Add your preferred license here before open-sourcing publicly.
