import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket } from 'socket.io-client';
import { SessionManager } from '../services/sessionManager';
import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';
import { setupQuizSockets } from '../sockets/quizSocketHandler';
import { ExportService } from '../services/exportService';

async function runIntegrationSimulation() {
  console.log('--- Starting QuizArena End-to-End Real-Time Socket Simulation ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  setupQuizSockets(io);

  const TEST_PORT = 5055;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`[Sim] Test server listening on port ${TEST_PORT}`);

  const serverUrl = `http://localhost:${TEST_PORT}`;
  const sessionManager = SessionManager.getInstance();
  const testQuiz = SAMPLE_QUIZZES[0];

  // 1. Create Session
  const session = sessionManager.createSession(testQuiz, 'host-sim', 'host-sock-sim');
  const pin = session.pin;
  console.log(`[Sim] Created test session PIN: ${pin} for "${testQuiz.title}"`);

  // 2. Connect Sockets
  const hostSocket = ClientSocket(serverUrl, { transports: ['websocket'] });
  const aliceSocket = ClientSocket(serverUrl, { transports: ['websocket'] });
  const bobSocket = ClientSocket(serverUrl, { transports: ['websocket'] });

  await Promise.all([
    new Promise<void>(res => hostSocket.on('connect', res)),
    new Promise<void>(res => aliceSocket.on('connect', res)),
    new Promise<void>(res => bobSocket.on('connect', res))
  ]);
  console.log('✅ PASS: Host, Alice, and Bob sockets connected successfully');

  // Register host
  hostSocket.emit('host_join_room', { sessionId: session.id, pin });

  // Alice and Bob join
  let aliceId = '';
  let bobId = '';

  await Promise.all([
    new Promise<void>((resolve) => {
      aliceSocket.emit('join_session', { pin, nickname: 'Alice', avatar: 'avatar-1' });
      aliceSocket.on('session_joined', (data) => {
        aliceId = data.participant.id;
        resolve();
      });
    }),
    new Promise<void>((resolve) => {
      bobSocket.emit('join_session', { pin, nickname: 'Bob', avatar: 'avatar-2' });
      bobSocket.on('session_joined', (data) => {
        bobId = data.participant.id;
        resolve();
      });
    })
  ]);

  console.log(`✅ PASS: Alice (ID: ${aliceId.slice(0, 8)}) and Bob (ID: ${bobId.slice(0, 8)}) joined lobby`);
  console.log(`[Sim] Total participants in session: ${session.participants.size}`);

  // 3. Start Quiz
  hostSocket.emit('host_start_quiz', { sessionId: session.id });
  hostSocket.emit('host_next_question', { sessionId: session.id });

  let clientQuestion: any = null;
  await new Promise<void>((resolve) => {
    aliceSocket.on('question_start', (data) => {
      clientQuestion = data.question;
      resolve();
    });
  });

  console.log(`✅ PASS: Question 1 received by participants: "${clientQuestion.questionText}"`);

  // Anti-cheat verification: ensure isCorrect is undefined in options sent to clients
  const leakedAnswer = clientQuestion.options.some((opt: any) => opt.isCorrect !== undefined);
  if (leakedAnswer) {
    throw new Error('ANTI-CHEAT LEAK: isCorrect field was found in client question options!');
  }
  console.log('✅ PASS: Anti-cheat confirmed - no correct answers leaked to client during question');

  // Find correct option from session definition
  const fullQ = session.questions[0];
  const correctOpt = fullQ.options.find(o => o.isCorrect);

  // Alice submits quickly
  let aliceResult: any = null;
  await new Promise<void>((resolve) => {
    aliceSocket.emit('submit_answer', {
      sessionId: session.id,
      participantId: aliceId,
      optionId: correctOpt?.id
    });
    aliceSocket.on('answer_acknowledged', (data) => {
      aliceResult = data;
      resolve();
    });
  });

  // Bob submits
  let bobResult: any = null;
  await new Promise<void>((resolve) => {
    bobSocket.emit('submit_answer', {
      sessionId: session.id,
      participantId: bobId,
      optionId: correctOpt?.id
    });
    bobSocket.on('answer_acknowledged', (data) => {
      bobResult = data;
      resolve();
    });
  });

  console.log(`✅ PASS: Answers acknowledged. Alice: +${aliceResult.pointsEarned} pts, Bob: +${bobResult.pointsEarned} pts`);

  // 4. End question and show results
  hostSocket.emit('host_show_results', { sessionId: session.id });

  let distributionReceived: any = null;
  await new Promise<void>((resolve) => {
    hostSocket.on('question_ended', (data) => {
      distributionReceived = data;
      resolve();
    });
  });

  console.log(`✅ PASS: Answer distribution received (${distributionReceived.totalAnswers} total answers). Correct option: ${distributionReceived.correctOptionId}`);

  // 5. Host shows leaderboard
  hostSocket.emit('host_show_leaderboard', { sessionId: session.id });

  let leaderboardData: any = null;
  await new Promise<void>((resolve) => {
    hostSocket.on('leaderboard_update', (data) => {
      leaderboardData = data.leaderboard;
      resolve();
    });
  });

  console.log('✅ PASS: Leaderboard received:');
  leaderboardData.forEach((entry: any) => {
    console.log(`   Rank #${entry.rank}: ${entry.nickname} - ${entry.totalScore} pts (last: +${entry.lastQuestionScore})`);
  });

  // Verify Alice has rank #1 and higher or equal score
  if (leaderboardData[0].nickname !== 'Alice') {
    throw new Error(`Expected Alice at #1, but found ${leaderboardData[0].nickname}`);
  }

  // 6. Test Excel and CSV generation
  const csv = ExportService.generateLeaderboardCSV(session, leaderboardData);
  const excel = ExportService.generateExcelWorkbook(session, leaderboardData);

  if (csv.length < 50) throw new Error('CSV output too small');
  if (excel.length < 1000) throw new Error('Excel workbook buffer too small');
  console.log(`✅ PASS: Export generated - CSV: ${csv.length} bytes, Excel: ${excel.length} bytes`);

  // Cleanup
  hostSocket.disconnect();
  aliceSocket.disconnect();
  bobSocket.disconnect();
  server.close();
  console.log('🎉 ALL INTEGRATION SIMULATION TESTS PASSED SUCCESSFULLY!');
}

runIntegrationSimulation().catch(err => {
  console.error('❌ SIMULATION FAILED:', err);
  process.exit(1);
});
