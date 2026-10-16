import { Server, Socket } from 'socket.io';
import { SessionManager } from '../services/sessionManager';

export function setupQuizSockets(io: Server) {
  const sessionManager = SessionManager.getInstance();

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // --- Participant Join Lobby ---
    socket.on('join_session', (payload: { pin: string; nickname: string; avatar?: string }) => {
      const { pin, nickname, avatar } = payload;
      const result = sessionManager.joinSession(pin, nickname, socket.id, avatar);

      if ('error' in result) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      const { participant, session } = result;
      const room = `quiz:${session.pin}`;
      socket.join(room);

      // Confirm to joining player
      socket.emit('session_joined', {
        sessionId: session.id,
        pin: session.pin,
        participant,
        quizTitle: session.quizTitle,
        totalQuestions: session.questions.length
      });

      // Notify host and room of updated participant list
      const participantsList = Array.from(session.participants.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        rank: p.rank,
        isConnected: p.isConnected,
        emoji: p.emoji
      }));

      io.to(room).emit('participant_list_update', {
        count: session.participants.size,
        participants: participantsList
      });

      console.log(`[Socket] Participant "${participant.nickname}" joined room ${room}`);
    });

    // --- Participant Session Reconnect ---
    socket.on('reconnect_session', (payload: { pin: string; participantId: string }) => {
      const { pin, participantId } = payload;
      const result = sessionManager.reconnectParticipant(pin, participantId, socket.id);

      if ('error' in result) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      const { participant, session } = result;
      const room = `quiz:${session.pin}`;
      socket.join(room);

      let currentQuestion = null;
      if (session.status === 'question' && session.currentQuestionIndex >= 0) {
        const fullQ = session.questions[session.currentQuestionIndex];
        currentQuestion = {
          id: fullQ.id,
          quizId: fullQ.quizId,
          questionText: fullQ.questionText,
          mediaUrl: fullQ.mediaUrl,
          timeLimit: fullQ.timeLimit,
          points: fullQ.points,
          options: fullQ.options.map(opt => ({ id: opt.id, text: opt.text })),
          order: fullQ.order,
          questionIndex: session.currentQuestionIndex,
          totalQuestions: session.questions.length
        };
      }

      // Check if already answered current question
      let alreadyAnswered = false;
      if (session.currentQuestionIndex >= 0) {
        const currentQId = session.questions[session.currentQuestionIndex].id;
        const qResponses = session.responses.get(currentQId) || [];
        alreadyAnswered = qResponses.some(r => r.participantId === participantId);
      }

      socket.emit('session_reconnected', {
        sessionId: session.id,
        pin: session.pin,
        status: session.status,
        participant,
        quizTitle: session.quizTitle,
        currentQuestion,
        alreadyAnswered,
        totalQuestions: session.questions.length
      });

      // Update participant list
      const participantsList = Array.from(session.participants.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        rank: p.rank,
        isConnected: p.isConnected,
        emoji: p.emoji
      }));

      io.to(room).emit('participant_list_update', {
        count: session.participants.size,
        participants: participantsList
      });

      console.log(`[Socket] Participant "${participant.nickname}" reconnected to ${room}`);
    });

    // --- Host Joins Room ---
    socket.on('host_join_room', (payload: { sessionId: string; pin: string }) => {
      const session = sessionManager.getSessionById(payload.sessionId);
      if (session) {
        session.hostSocketId = socket.id;
        const room = `quiz:${session.pin}`;
        socket.join(room);
        console.log(`[Socket] Host socket connected to room ${room}`);

        const participantsList = Array.from(session.participants.values()).map(p => ({
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score,
          rank: p.rank,
          isConnected: p.isConnected, emoji: p.emoji
        }));

        socket.emit('participant_list_update', {
          count: session.participants.size,
          participants: participantsList
        });
      }
    });

    // --- Host Starts Quiz ---
    socket.on('host_start_quiz', (payload: { sessionId: string }) => {
      const session = sessionManager.getSessionById(payload.sessionId);
      if (!session) return;

      const room = `quiz:${session.pin}`;
      sessionManager.startQuiz(payload.sessionId);

      io.to(room).emit('quiz_countdown', { countdown: 3 });
    });

    // --- Host Next Question ---
    socket.on('host_next_question', (payload: { sessionId: string }) => {
      const session = sessionManager.getSessionById(payload.sessionId);
      if (!session) return;

      const room = `quiz:${session.pin}`;
      const res = sessionManager.nextQuestion(payload.sessionId);

      if (res.error) {
        socket.emit('error_message', { message: res.error });
        return;
      }

      // Send sanitized question to participants (isCorrect stripped)
      io.to(room).emit('question_start', {
        question: res.question,
        questionIndex: res.questionIndex,
        totalQuestions: res.totalQuestions,
        timeLimit: res.question?.timeLimit || 20
      });

      // Send full question to host
      socket.emit('host_question_active', {
        question: res.fullQuestion,
        questionIndex: res.questionIndex,
        totalQuestions: res.totalQuestions,
        answersReceived: 0,
        totalParticipants: session.participants.size
      });
    });

    // --- Participant Submits Answer ---
    socket.on('submit_answer', (payload: { sessionId: string; participantId: string; optionId: string }) => {
      const { sessionId, participantId, optionId } = payload;
      const session = sessionManager.getSessionById(sessionId);
      if (!session) return;

      const room = `quiz:${session.pin}`;
      const result = sessionManager.submitAnswer(sessionId, participantId, optionId);

      if (!result.success) {
        socket.emit('answer_error', { message: result.error });
        return;
      }

      // Acknowledge to participant
      socket.emit('answer_acknowledged', {
        pointsEarned: result.pointsEarned,
        isCorrect: result.isCorrect,
        streak: result.streak
      });

      // Notify host of live count increment
      io.to(room).emit('answers_count_update', {
        answersReceived: result.answersReceived,
        totalConnected: result.totalConnected
      });
    });

    // --- Host Shows Results (Distribution) ---
    socket.on('host_show_results', (payload: { sessionId: string }) => {
      const session = sessionManager.getSessionById(payload.sessionId);
      if (!session) return;

      const room = `quiz:${session.pin}`;
      const { distribution, correctOptionId, totalAnswers } = sessionManager.endQuestion(payload.sessionId);

      io.to(room).emit('question_ended', {
        distribution,
        correctOptionId,
        totalAnswers
      });
    });

    // --- Host Shows Live Leaderboard ---
    socket.on('host_show_leaderboard', (payload: { sessionId: string }) => {
      const session = sessionManager.getSessionById(payload.sessionId);
      if (!session) return;

      const room = `quiz:${session.pin}`;
      session.status = 'leaderboard';
      const leaderboard = sessionManager.getLeaderboard(payload.sessionId);

      io.to(room).emit('leaderboard_update', {
        leaderboard,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.questions.length
      });
    });

    // --- Host Ends Quiz ---
    socket.on('host_end_quiz', (payload: { sessionId: string }) => {
      const session = sessionManager.getSessionById(payload.sessionId);
      if (!session) return;

      const room = `quiz:${session.pin}`;
      const { podium, fullLeaderboard } = sessionManager.endQuiz(payload.sessionId);

      io.to(room).emit('quiz_ended', {
        podium,
        leaderboard: fullLeaderboard
      });
    });

    // --- Host Kicks Participant ---
    socket.on('host_kick_participant', (payload: { sessionId: string; participantId: string }) => {
      const session = sessionManager.getSessionById(payload.sessionId);
      if (!session) return;

      const room = `quiz:${session.pin}`;
      const participant = session.participants.get(payload.participantId);

      if (participant) {
        io.to(participant.socketId).emit('kicked_from_session', {
          message: 'You have been removed from the session by the host.'
        });
        sessionManager.kickParticipant(payload.sessionId, payload.participantId);

        const participantsList = Array.from(session.participants.values()).map(p => ({
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score,
          rank: p.rank,
          isConnected: p.isConnected,
          emoji: p.emoji
        }));

        io.to(room).emit('participant_list_update', {
          count: session.participants.size,
          participants: participantsList
        });
      }
    });

    // --- Disconnect Handling ---
    socket.on('disconnect', () => {
      const { sessionId, participant } = sessionManager.handleDisconnect(socket.id);
      if (sessionId && participant) {
        const session = sessionManager.getSessionById(sessionId);
        if (session) {
          const room = `quiz:${session.pin}`;
          io.to(room).emit('participant_status_change', {
            participantId: participant.id,
            isConnected: false
          });
        }
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}
