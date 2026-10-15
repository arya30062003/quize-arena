# 🌐 QuizArena - Cloud Deployment Guide

QuizArena is a real-time multiplayer application with a **React Frontend** and a **Node.js + Socket.IO Backend**. You have three distinct, production-grade deployment paths depending on your hosting preference:

---

## 🏆 Option 1: Render / Railway (Easiest, 100% Free & 1-Click)
*Recommended for quickest public URL with full WebSocket and SSL support.*

Render or Railway allows you to deploy the entire application (frontend + backend + WebSockets) as **a single unified container** using the pre-configured [Dockerfile](file:///C:/Users/Kewte/.gemini/antigravity/scratch/quiz-arena/Dockerfile) and [render.yaml](file:///C:/Users/Kewte/.gemini/antigravity/scratch/quiz-arena/render.yaml).

### Steps:
1. Push your `quiz-arena` repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial QuizArena commit"
   # Push to your GitHub repo
   ```
2. Log into [Render.com](https://render.com) (or [Railway.app](https://railway.app)).
3. Click **New +** $\rightarrow$ **Web Service**.
4. Select your GitHub repository.
5. Render will automatically detect the `Dockerfile`:
   - **Environment**: Docker
   - **Plan**: Free
   - **PORT**: `8080` (or `5000`)
6. Click **Deploy Web Service**!
7. Within 2 minutes, you will get a public HTTPS URL (e.g., `https://quiz-arena.onrender.com`).
   - Anyone on any device, mobile phone, or laptop in the world can now visit this URL to host or join quizzes!

---

## ☁️ Option 2: Firebase Hosting + Google Cloud Run (Full Google Ecosystem)
*Recommended if you want the frontend on Firebase's global CDN and the backend on Google Cloud.*

### Step A: Deploy Backend to Google Cloud Run
1. Install [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) if you haven't already.
2. Build and submit the container to Google Cloud:
   ```bash
   gcloud builds submit --tag gcr.io/<YOUR_FIREBASE_PROJECT_ID>/quiz-arena-server
   ```
3. Deploy to Cloud Run with WebSocket session affinity:
   ```bash
   gcloud run deploy quiz-arena-server \
     --image gcr.io/<YOUR_FIREBASE_PROJECT_ID>/quiz-arena-server \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --session-affinity \
     --port 8080
   ```
4. Note your public backend URL (e.g. `https://quiz-arena-server-xyz.a.run.app`).

### Step B: Build and Deploy Frontend to Firebase Hosting
1. In `client/.env.production`, set your Cloud Run URL:
   ```env
   VITE_SERVER_URL=https://quiz-arena-server-xyz.a.run.app
   ```
2. Build the client bundle:
   ```powershell
   cd client
   npm.cmd run build
   cd ..
   ```
3. Deploy to Firebase Hosting:
   ```powershell
   npx.cmd -y firebase-tools@latest deploy --only hosting
   ```
4. Your frontend will be live on `https://<YOUR_FIREBASE_PROJECT_ID>.web.app`!

---

## 🚀 Option 3: Quick Direct Firebase Hosting (Using Firebase CLI)

If you already have a Firebase project created in the [Firebase Console](https://console.firebase.google.com):

1. **Login to Firebase**:
   ```powershell
   npx.cmd -y firebase-tools@latest login
   ```
   *(If on a remote server without a local browser, use `npx.cmd -y firebase-tools@latest login --no-localhost`)*

2. **Select or Link your Firebase Project**:
   ```powershell
   npx.cmd -y firebase-tools@latest use <YOUR_PROJECT_ID>
   ```

3. **Deploy Firestore Rules and Hosting**:
   ```powershell
   npx.cmd -y firebase-tools@latest deploy --only firestore:rules,hosting
   ```

---

## ⚙️ Environment Variables Summary

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Port for the backend server | `5000` (local) / `8080` (cloud) |
| `CLIENT_URL` | Allowed CORS origins for Socket.IO | `*` or `https://your-app.web.app` |
| `VITE_SERVER_URL` | Frontend pointer to external backend | Leave empty if unified container |
| `FIREBASE_PROJECT_ID` | Your Google Firebase project ID | `quiz-arena-default` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to serviceAccountKey.json (Optional) | Fallback in-memory store if unset |
