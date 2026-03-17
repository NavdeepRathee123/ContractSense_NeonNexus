# TrustSeal AI - Local Setup Guide

Follow these steps to run the TrustSeal AI project on your local machine.

## 1. Prerequisites
- **Node.js**: Install Node.js (v18 or higher recommended).
- **npm**: Comes with Node.js.

## 2. Setup Firebase
Since this app uses Firebase for Auth and Database, you need your own Firebase project.

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and follow the steps.
3. **Authentication**:
   - Go to "Authentication" in the left sidebar.
   - Click "Get Started".
   - Enable **Google** as a Sign-in provider.
4. **Firestore Database**:
   - Go to "Firestore Database".
   - Click "Create Database".
   - Choose a location and start in **Test Mode** (or production if you're ready to set up rules).
5. **Project Settings**:
   - Click the gear icon (Project Settings).
   - Scroll down to "Your apps" and click the **Web icon (`</>`)** to register a new web app.
   - Copy the `firebaseConfig` object. It looks like this:
     ```json
     {
       "apiKey": "...",
       "authDomain": "...",
       "projectId": "...",
       "storageBucket": "...",
       "messagingSenderId": "...",
       "appId": "..."
     }
     ```

## 3. Setup Gemini AI
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click on **Get API Key**.
3. Create a new API key.

## 4. Local Installation

1. **Clone/Download** the project files to your computer.
2. Open a terminal in the project folder.
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Configure Environment Variables**:
   - A `.env` file has already been created for you with your Gemini API key and Local URL.
   - If you need to change them, edit the `.env` file in the root directory:
     ```env
     GEMINI_API_KEY=AIzaSyAvxcMJ7zT8GlzG_FeLwQar2bkUB8XjoS0
     APP_URL=http://localhost:3000
     ```
5. **Configure Firebase**:
   - Open `src/firebase-applet-config.json` (or create it if missing).
   - Paste your Firebase configuration values there.

## 5. Security Rules
Copy the content of `firestore.rules` from this project and paste it into the **Rules** tab of your Firestore Database in the Firebase Console. Click **Publish**.

## 6. Run the App
```bash
npm run dev
```
The app will be available at `http://localhost:3000` (or the port shown in your terminal).

## 7. Admin Setup
To make yourself an admin locally:
1. Sign in to the app once.
2. Go to the Firebase Console -> Firestore Database.
3. Find your user document in the `users` collection.
4. Change the `role` field from `"user"` to `"admin"`.
5. Refresh the app.
