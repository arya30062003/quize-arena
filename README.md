# 🏆 QuizArena - Real-Time Quiz Competition Platform

A production-ready, high-performance real-time quiz competition web application inspired by Kahoot. Built with **React 18**, **TypeScript**, **Tailwind CSS**, **Node.js**, **Express**, **Socket.IO**, **Recharts**, and **Firebase Firestore / Auth**.

---

## 🌟 Key Features

### 1. User Roles
- **Host / Admin**: Create & edit quizzes, manage lobbies, control question progression, view live answer distributions, access analytics dashboards, and export reports.
- **Participants / Students**: Join quickly via 6-digit PIN or QR code, pick custom avatars, receive synchronized questions in real-time, submit single MCQ responses, track immediate scoring feedback, and view live standings.

### 2. Gamified Mobile-First Experience
- High-contrast Kahoot-style MCQ cards (Red Triangle, Blue Diamond, Yellow Circle, Green Square).
- Interactive SVG circular countdown timers and urgency ticks.
- Dynamic Web Audio API synthesized sound effects (countdown ticks, lock-in swooshes, correct chimes, incorrect buzzes, victory fanfares) with zero external asset dependencies.
- Confetti explosion and 3-tier Olympic podium (1st, 2nd, 3rd) upon tournament completion.

### 3. Anti-Cheat & High Concurrency Engine
- **Server-Side Timestamping**: Time elapsed is measured strictly by the server (`Date.now() - questionStartTime`).
- **Zero Premature Data Leakage**: Correct option flags (`isCorrect`) are stripped by the server before questions are distributed to players.
- **Single Submission Guarantee**: Atomic set validation locks in the first submitted answer and ignores repeat submissions.
- **Session Recovery**: Local storage auto-reconnects players if their browser tab is refreshed or network drops.
- **Scalable Architecture**: Dual-layer architecture with in-memory active session cache provides sub-millisecond response processing (supporting 500+ concurrent players) with asynchronous persistence to Cloud Firestore.

---

## 🎯 Scoring Formula

$$\text{Score} = \begin{cases} 
100 + \text{round}\left(\frac{\text{maxTime} - \text{responseTime}}{\text{maxTime}} \times 50\right) & \text{if answer is correct} \\
0 & \text{if answer is incorrect}
\end{cases}$$

- **Base Points**: 100 points
- **Speed Bonus**: Up to 50 points based on how fast the participant responds
- **Max Score per Question**: 150 points
- **Incorrect Answer**: 0 points

---

## 📁 Project Structure

```
quiz-arena/
├── client/                     # Frontend SPA (React + TypeScript + Vite + TailwindCSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Navbar, ThemeToggle, SoundToggle
│   │   │   ├── host/           # HostDashboard, QuizEditor, HostLobby, HostQuestionView,
│   │   │   │                   # HostAnswerDistribution, HostLeaderboard, HostPodium, AnalyticsDashboard
│   │   │   └── player/         # PlayerJoin, PlayerLobby, PlayerQuestionView, PlayerAnswerFeedback,
│   │   │                       # PlayerLeaderboard, PlayerPodium
│   │   ├── context/            # SocketContext, ThemeContext
│   │   ├── services/           # REST API client, Firebase Client
│   │   ├── types/              # Client TypeScript models
│   │   ├── utils/              # Web Audio sound effects synthesizer
│   │   ├── App.tsx             # Main view router & state synchronizer
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                     # Backend Service (Node.js + Express + Socket.IO)
│   ├── src/
│   │   ├── controllers/        # Quiz CRUD & Session endpoints
│   │   ├── data/               # Sample quizzes (Web Dev, Science & Tech)
│   │   ├── services/           # SessionManager, ScoringService, FirestoreService, ExportService
│   │   ├── sockets/            # Socket.IO lifecycle event handler
│   │   ├── tests/              # Scoring formula unit test suite
│   │   ├── types/              # Shared data contracts
│   │   └── index.ts            # Express app + HTTP server + Socket.IO server
│   ├── package.json
│   └── tsconfig.json
├── firebase.json               # Firebase Hosting & Emulator configuration
├── firestore.rules             # Production security rules
├── firestore.indexes.json      # Composite query indexes
└── package.json                # Root workspace scripts
```

---

## 🗄️ Database Schema (Cloud Firestore)

### 1. `/quizzes/{quizId}`
```typescript
{
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage?: string;
  authorId: string;
  isPublic: boolean;
  totalQuestions: number;
  createdAt: number;
  updatedAt: number;
  questions: Question[];
}
```

### 2. `/quiz_sessions/{sessionId}`
```typescript
{
  id: string;
  pin: string;              // 6-digit numeric game PIN
  quizId: string;
  hostId: string;
  status: 'lobby' | 'countdown' | 'question' | 'review' | 'leaderboard' | 'ended';
  currentQuestionIndex: number;
  totalParticipants: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}
```

### 3. `/quiz_sessions/{sessionId}/responses/{responseId}`
```typescript
{
  id: string;
  sessionId: string;
  questionId: string;
  participantId: string;
  nickname: string;
  selectedOptionId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  pointsEarned: number;
  submittedAt: number;
}
```

---

## 📡 Socket.IO Real-Time Event Protocol

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join_session` | Client $\rightarrow$ Server | `{ pin, nickname, avatar }` | Participant joins lobby |
| `reconnect_session` | Client $\rightarrow$ Server | `{ pin, participantId }` | Participant recovers state on page reload |
| `host_join_room` | Host $\rightarrow$ Server | `{ sessionId, pin }` | Host registers socket with session room |
| `host_start_quiz` | Host $\rightarrow$ Server | `{ sessionId }` | Triggers 3-second countdown |
| `host_next_question` | Host $\rightarrow$ Server | `{ sessionId }` | Advances to next question (sanitized to players) |
| `submit_answer` | Client $\rightarrow$ Server | `{ sessionId, participantId, optionId }` | Records answer, computes score & bonus |
| `host_show_results` | Host $\rightarrow$ Server | `{ sessionId }` | Emits answer distribution bar chart data |
| `host_show_leaderboard` | Host $\rightarrow$ Server | `{ sessionId }` | Emits updated rank standings |
| `host_end_quiz` | Host $\rightarrow$ Server | `{ sessionId }` | Declares tournament end, renders podium |
| `host_kick_participant` | Host $\rightarrow$ Server | `{ sessionId, participantId }` | Removes disruptive player from room |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js 18+ (tested with Node v24)
- npm 9+

### 1. Installation
Install dependencies for both server and client:
```bash
cd server
npm.cmd install

cd ../client
npm.cmd install
```

### 2. Run Tests
Verify the scoring formula and speed bonus calculations:
```bash
cd server
npm.cmd test
```

### 3. Run Development Servers
Open two terminal windows:

**Terminal 1 (Backend API & Socket.IO):**
```bash
cd server
npm.cmd run dev
# Server starts on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm.cmd run dev
# Client starts on http://localhost:5173
```

Visit `http://localhost:5173` in your browser.

---

## 📊 Exporting Reports

QuizArena includes native export capabilities:
- **Excel (.xlsx)**: Multi-sheet workbook including:
  1. Final Leaderboard (ranks, names, scores, streaks)
  2. Question Analysis (accuracy %, response counts, average response times)
  3. Individual Participant Responses
- **CSV**: Standard comma-separated format with UTF-8 BOM encoding for seamless Microsoft Excel import.

---

## ☁️ Deployment Instructions

### Deploy Frontend to Firebase Hosting
```bash
# Build frontend
cd client
npm.cmd run build

# Deploy to Firebase Hosting
cd ..
firebase deploy --only hosting
```

### Deploy Backend to Cloud Run or Node Server
The backend can be deployed as a containerized service (e.g. Google Cloud Run, Render, Railway, AWS ECS) or standard Node VM:
```bash
cd server
npm.cmd run build
npm.cmd start
```
Make sure to set the environment variable `CLIENT_URL` to your production frontend URL (e.g. `https://your-app.web.app`).
