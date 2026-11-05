import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from '../services/sessionManager';
import { ChatMessage } from '../types';

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

      // Send recent chat history
      socket.emit('chat_history', {
        messages: sessionManager.getChatMessages(session.pin, participant.id)
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

      // Send chat history on reconnect
      socket.emit('chat_history', {
        messages: sessionManager.getChatMessages(session.pin, participant.id)
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

        // Send chat history to host
        socket.emit('chat_history', {
          messages: sessionManager.getChatMessages(session.pin, 'host')
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

    // --- WhatsApp-Style Real-Time Messaging ---
    socket.on('send_chat_message', (payload: {
      pin: string;
      senderId: string;
      senderNickname: string;
      senderAvatar?: string;
      senderEmoji?: string;
      text: string;
      recipientId?: string;
      recipientNickname?: string;
    }) => {
      const { pin, senderId, senderNickname, senderAvatar, senderEmoji, text, recipientId, recipientNickname } = payload;
      if (!pin || !text || !text.trim()) return;

      const cleanText = text.trim().slice(0, 500);
      const session = sessionManager.getSessionByPin(pin);
      if (!session) return;

      const chatMsg: ChatMessage = {
        id: uuidv4(),
        pin,
        senderId: senderId || 'anonymous',
        senderNickname: senderNickname || 'Participant',
        senderAvatar,
        senderEmoji,
        text: cleanText,
        timestamp: Date.now(),
        recipientId: recipientId || undefined,
        recipientNickname: recipientNickname || undefined
      };

      // Store in session manager
      sessionManager.addChatMessage(pin, chatMsg);

      if (recipientId) {
        // 1-on-1 Direct Message
        let targetSocketId: string | undefined;
        if (recipientId === 'host') {
          targetSocketId = session.hostSocketId;
        } else {
          const targetParticipant = session.participants.get(recipientId);
          if (targetParticipant) {
            targetSocketId = targetParticipant.socketId;
          }
        }

        if (targetSocketId) {
          io.to(targetSocketId).emit('chat_message_received', chatMsg);
        }
        // Also echo back to sender socket so sender gets immediate confirmation with server ID & timestamp
        if (socket.id !== targetSocketId) {
          socket.emit('chat_message_received', chatMsg);
        }
      } else {
        // Room Group Chat: broadcast to everyone in the room
        const room = `quiz:${session.pin}`;
        io.to(room).emit('chat_message_received', chatMsg);
      }
    });

    socket.on('get_chat_history', (payload: { pin: string; participantId?: string }) => {
      const { pin, participantId } = payload;
      if (!pin) return;
      const messages = sessionManager.getChatMessages(pin, participantId);
      socket.emit('chat_history', { messages });
    });

    // --- Instant Key-Based Chat (Home Page) ---
    socket.on('join_instant_chat', (payload: { chatKey: string; nickname: string; avatar?: string; emoji?: string }) => {
      const { chatKey, nickname, avatar, emoji } = payload;
      if (!chatKey || !nickname || !nickname.trim() || !chatKey.trim()) {
        socket.emit('instant_chat_error', { message: 'Chat Key and Nickname are required.' });
        return;
      }

      const { member, room } = sessionManager.joinInstantChat(chatKey, nickname, socket.id, avatar, emoji);
      const roomChannel = `instant:${room.chatKey}`;
      socket.join(roomChannel);

      const membersList = sessionManager.getInstantChatMembers(room.chatKey);
      const messagesList = sessionManager.getInstantChatMessages(room.chatKey);

      socket.emit('instant_chat_joined', {
        chatKey: room.chatKey,
        member,
        members: membersList,
        messages: messagesList
      });

      io.to(roomChannel).emit('instant_chat_members_update', {
        chatKey: room.chatKey,
        count: membersList.length,
        members: membersList
      });

      console.log(`[Socket] Member "${member.nickname}" joined instant chat key: ${room.chatKey}`);
    });

    socket.on('send_instant_chat_message', (payload: {
      chatKey: string;
      text: string;
      senderId: string;
      senderNickname: string;
      senderAvatar?: string;
      senderEmoji?: string;
    }) => {
      const { chatKey, text, senderId, senderNickname, senderAvatar, senderEmoji } = payload;
      if (!chatKey || !text || !text.trim()) return;

      const cleanText = text.trim().slice(0, 500);
      const cleanKey = chatKey.trim().toUpperCase();

      const chatMsg: ChatMessage = {
        id: uuidv4(),
        pin: cleanKey,
        senderId: senderId || socket.id,
        senderNickname: senderNickname || 'User',
        senderAvatar,
        senderEmoji,
        text: cleanText,
        timestamp: Date.now()
      };

      sessionManager.addInstantChatMessage(cleanKey, chatMsg);

      const roomChannel = `instant:${cleanKey}`;
      io.to(roomChannel).emit('instant_chat_message_received', chatMsg);
    });

    socket.on('leave_instant_chat', () => {
      const result = sessionManager.leaveInstantChat(socket.id);
      if (result) {
        const roomChannel = `instant:${result.chatKey}`;
        socket.leave(roomChannel);
        const membersList = sessionManager.getInstantChatMembers(result.chatKey);
        io.to(roomChannel).emit('instant_chat_members_update', {
          chatKey: result.chatKey,
          count: membersList.length,
          members: membersList
        });
      }
    });

    // --- Disconnect Handling ---
    socket.on('disconnect', () => {
      // Clean up any instant chat participation
      const instantLeave = sessionManager.leaveInstantChat(socket.id);
      if (instantLeave) {
        const roomChannel = `instant:${instantLeave.chatKey}`;
        const membersList = sessionManager.getInstantChatMembers(instantLeave.chatKey);
        io.to(roomChannel).emit('instant_chat_members_update', {
          chatKey: instantLeave.chatKey,
          count: membersList.length,
          members: membersList
        });
      }

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
