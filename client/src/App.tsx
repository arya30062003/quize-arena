import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { HostDashboard } from './components/host/HostDashboard';
import { QuizEditor } from './components/host/QuizEditor';
import { HostLobby } from './components/host/HostLobby';
import { HostQuestionView } from './components/host/HostQuestionView';
import { HostAnswerDistribution } from './components/host/HostAnswerDistribution';
import { HostLeaderboard } from './components/host/HostLeaderboard';
import { HostPodium } from './components/host/HostPodium';
import { AnalyticsDashboard } from './components/host/AnalyticsDashboard';

import { PlayerJoin } from './components/player/PlayerJoin';
import { SplashScreen } from './components/common/SplashScreen';
import { PlayerLobby } from './components/player/PlayerLobby';
import { PlayerQuestionView } from './components/player/PlayerQuestionView';
import { PlayerAnswerFeedback } from './components/player/PlayerAnswerFeedback';
import { PlayerLeaderboard } from './components/player/PlayerLeaderboard';
import { PlayerPodium } from './components/player/PlayerPodium';

import { useSocket } from './context/SocketContext';
import { Participant, Question, QuestionDistribution, LeaderboardEntry } from './types';

type AppView = 'dashboard' | 'editor' | 'host_arena' | 'join' | 'player_arena' | 'analytics';
type HostStage = 'lobby' | 'countdown' | 'question' | 'results' | 'leaderboard' | 'podium';
type PlayerStage = 'lobby' | 'countdown' | 'question' | 'feedback' | 'leaderboard' | 'podium';

export const App: React.FC = () => {
  const { socket, isConnected } = useSocket();

  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>('join');
  const [editingQuizId, setEditingQuizId] = useState<string | undefined>(undefined);
  const [analyticsSessionId, setAnalyticsSessionId] = useState<string>('');

  // Host Arena State
  const [hostSession, setHostSession] = useState<{
    sessionId: string;
    pin: string;
    quizTitle: string;
    totalQuestions: number;
  } | null>(null);
  const [hostStage, setHostStage] = useState<HostStage>('lobby');
  const [hostParticipants, setHostParticipants] = useState<Participant[]>([]);
  const [currentHostQuestion, setCurrentHostQuestion] = useState<Question | null>(null);
  const [hostQuestionIndex, setHostQuestionIndex] = useState(0);
  const [hostAnswersReceived, setHostAnswersReceived] = useState(0);
  const [distributionData, setDistributionData] = useState<QuestionDistribution[]>([]);
  const [correctOptionId, setCorrectOptionId] = useState('');
  const [totalAnswersSubmitted, setTotalAnswersSubmitted] = useState(0);
  const [hostLeaderboard, setHostLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [podiumData, setPodiumData] = useState<LeaderboardEntry[]>([]);

  // Player Arena State
  const [playerSession, setPlayerSession] = useState<{
    sessionId: string;
    pin: string;
    quizTitle: string;
    totalQuestions: number;
    participant: Participant;
  } | null>(null);
  const [playerStage, setPlayerStage] = useState<PlayerStage>('lobby');
  const [currentPlayerQuestion, setCurrentPlayerQuestion] = useState<Question | null>(null);
  const [playerQuestionIndex, setPlayerQuestionIndex] = useState(0);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(undefined);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    pointsEarned: number;
    streak: number;
  }>({ isCorrect: false, pointsEarned: 0, streak: 0 });
  const [playerLeaderboard, setPlayerLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showSplash, setShowSplash] = useState(true);

  // Pre-filled PIN from URL query param
  const [initialPin, setInitialPin] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      setInitialPin(pinParam);
      setCurrentView('join');
    }
  }, []);

  // Session Recovery on Refresh
  useEffect(() => {
    if (!socket || !isConnected) return;

    const saved = localStorage.getItem('quizarena_player_session');
    if (saved && !playerSession) {
      try {
        const { pin, participantId } = JSON.parse(saved);
        if (pin && participantId) {
          console.log('[Recovery] Attempting to reconnect session:', pin, participantId);
          socket.emit('reconnect_session', { pin, participantId });
        }
      } catch (e) {}
    }
  }, [socket, isConnected]);

  // Global Socket Listeners
  useEffect(() => {
    if (!socket) return;

    // Reconnection response
    const handleReconnected = (data: any) => {
      setPlayerSession({
        sessionId: data.sessionId,
        pin: data.pin,
        quizTitle: data.quizTitle,
        totalQuestions: data.totalQuestions,
        participant: data.participant
      });

      setCurrentView('player_arena');

      if (data.status === 'question' && data.currentQuestion) {
        setCurrentPlayerQuestion(data.currentQuestion);
        setPlayerQuestionIndex(data.currentQuestion.questionIndex || 0);
        setHasSubmittedAnswer(data.alreadyAnswered || false);
        setPlayerStage('question');
      } else if (data.status === 'lobby') {
        setPlayerStage('lobby');
      } else {
        setPlayerStage('leaderboard');
      }
    };

    // Participant list updates in room
    const handleParticipantList = (data: { count: number; participants: Participant[] }) => {
      setHostParticipants(data.participants);
    };

    // Real-time answers counter update for host
    const handleAnswersCount = (data: { answersReceived: number }) => {
      setHostAnswersReceived(data.answersReceived);
    };

    // Countdown started by host
    const handleCountdown = () => {
      setHostStage('countdown');
      setPlayerStage('countdown');
      setTimeout(() => {
        if (currentView === 'host_arena' && hostSession) {
          socket.emit('host_next_question', { sessionId: hostSession.sessionId });
        }
      }, 3000);
    };

    // Host receives active question
    const handleHostQuestionActive = (data: any) => {
      setCurrentHostQuestion(data.question);
      setHostQuestionIndex(data.questionIndex);
      setHostAnswersReceived(0);
      setHostStage('question');
    };

    // Participants receive sanitized question
    const handleQuestionStart = (data: any) => {
      setCurrentPlayerQuestion(data.question);
      setPlayerQuestionIndex(data.questionIndex);
      setHasSubmittedAnswer(false);
      setSelectedOptionId(undefined);
      setPlayerStage('question');
    };

    // Answer acknowledged for participant
    const handleAnswerAcknowledged = (data: any) => {
      setHasSubmittedAnswer(true);
      setAnswerFeedback({
        isCorrect: data.isCorrect,
        pointsEarned: data.pointsEarned,
        streak: data.streak
      });
    };

    // Question ended -> reveal results / distribution
    const handleQuestionEnded = (data: any) => {
      setDistributionData(data.distribution);
      setCorrectOptionId(data.correctOptionId);
      setTotalAnswersSubmitted(data.totalAnswers);
      setHostStage('results');
      setPlayerStage('feedback');
    };

    // Leaderboard update
    const handleLeaderboardUpdate = (data: any) => {
      setHostLeaderboard(data.leaderboard);
      setPlayerLeaderboard(data.leaderboard);
      setHostStage('leaderboard');
      setPlayerStage('leaderboard');

      // Update player's own score in local session
      if (playerSession) {
        const me = data.leaderboard.find((p: any) => p.participantId === playerSession.participant.id);
        if (me) {
          setPlayerSession(prev => prev ? { ...prev, participant: { ...prev.participant, score: me.totalScore, rank: me.rank } } : null);
        }
      }
    };

    // Quiz ended -> podium
    const handleQuizEnded = (data: any) => {
      setPodiumData(data.podium);
      setHostLeaderboard(data.leaderboard);
      setPlayerLeaderboard(data.leaderboard);
      setHostStage('podium');
      setPlayerStage('podium');
    };

    // Kicked handler
    const handleKicked = (data: { message: string }) => {
      alert(data.message);
      localStorage.removeItem('quizarena_player_session');
      setPlayerSession(null);
      setCurrentView('join');
    };

    socket.on('session_reconnected', handleReconnected);
    socket.on('participant_list_update', handleParticipantList);
    socket.on('answers_count_update', handleAnswersCount);
    socket.on('quiz_countdown', handleCountdown);
    socket.on('host_question_active', handleHostQuestionActive);
    socket.on('question_start', handleQuestionStart);
    socket.on('answer_acknowledged', handleAnswerAcknowledged);
    socket.on('question_ended', handleQuestionEnded);
    socket.on('leaderboard_update', handleLeaderboardUpdate);
    socket.on('quiz_ended', handleQuizEnded);
    socket.on('kicked_from_session', handleKicked);

    return () => {
      socket.off('session_reconnected', handleReconnected);
      socket.off('participant_list_update', handleParticipantList);
      socket.off('answers_count_update', handleAnswersCount);
      socket.off('quiz_countdown', handleCountdown);
      socket.off('host_question_active', handleHostQuestionActive);
      socket.off('question_start', handleQuestionStart);
      socket.off('answer_acknowledged', handleAnswerAcknowledged);
      socket.off('question_ended', handleQuestionEnded);
      socket.off('leaderboard_update', handleLeaderboardUpdate);
      socket.off('quiz_ended', handleQuizEnded);
      socket.off('kicked_from_session', handleKicked);
    };
  }, [socket, currentView, hostSession, playerSession]);

  // --- Host Control Actions ---
  const handleStartHostSession = (data: {
    sessionId: string;
    pin: string;
    quizTitle: string;
    totalQuestions: number;
  }) => {
    setHostSession(data);
    setHostStage('lobby');
    setCurrentView('host_arena');
    if (socket) {
      socket.emit('host_join_room', { sessionId: data.sessionId, pin: data.pin });
    }
  };

  const handleStartQuiz = () => {
    if (socket && hostSession) {
      socket.emit('host_start_quiz', { sessionId: hostSession.sessionId });
    }
  };

  const handleHostQuestionTimeUp = () => {
    if (socket && hostSession) {
      socket.emit('host_show_results', { sessionId: hostSession.sessionId });
    }
  };

  const handleHostShowLeaderboard = () => {
    if (socket && hostSession) {
      socket.emit('host_show_leaderboard', { sessionId: hostSession.sessionId });
    }
  };

  const handleHostNextQuestion = () => {
    if (socket && hostSession) {
      socket.emit('host_next_question', { sessionId: hostSession.sessionId });
    }
  };

  const handleHostEndQuiz = () => {
    if (socket && hostSession) {
      socket.emit('host_end_quiz', { sessionId: hostSession.sessionId });
    }
  };

  // --- Player Actions ---
  const handlePlayerJoined = (data: any) => {
    setPlayerSession(data);
    setPlayerStage('lobby');
    setCurrentView('player_arena');
  };

  const handlePlayerSubmitAnswer = (optionId: string) => {
    if (socket && playerSession) {
      setSelectedOptionId(optionId);
      socket.emit('submit_answer', {
        sessionId: playerSession.sessionId,
        participantId: playerSession.participant.id,
        optionId
      });
    }
  };

  const handleLeaveGame = () => {
    localStorage.removeItem('quizarena_player_session');
    setPlayerSession(null);
    setCurrentView('join');
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar
        currentView={currentView}
        onNavigate={view => {
          if (view === 'join') {
            setCurrentView('join');
          } else if (view === 'dashboard') {
            setCurrentView('dashboard');
          } else if (view === 'editor') {
            setEditingQuizId(undefined);
            setCurrentView('editor');
          }
        }}
      />

      <main className="flex-1">
        {/* VIEW 1: Host Dashboard */}
        {currentView === 'dashboard' && (
          <HostDashboard
            onStartSession={handleStartHostSession}
            onEditQuiz={id => {
              setEditingQuizId(id);
              setCurrentView('editor');
            }}
            onViewAnalytics={id => {
              setAnalyticsSessionId(id);
              setCurrentView('analytics');
            }}
          />
        )}

        {/* VIEW 2: Quiz Editor */}
        {currentView === 'editor' && (
          <QuizEditor
            quizId={editingQuizId}
            onBack={() => setCurrentView('dashboard')}
            onSaved={() => setCurrentView('dashboard')}
          />
        )}

        {/* VIEW 3: Host Live Arena */}
        {currentView === 'host_arena' && hostSession && (
          <div>
            {hostStage === 'lobby' && (
              <HostLobby
                sessionId={hostSession.sessionId}
                pin={hostSession.pin}
                quizTitle={hostSession.quizTitle}
                participants={hostParticipants}
                onStartQuiz={handleStartQuiz}
              />
            )}

            {hostStage === 'countdown' && (
              <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center text-center">
                <div className="space-y-4 animate-scale-up">
                  <div className="text-8xl sm:text-9xl font-black text-indigo-600 dark:text-indigo-400 font-heading animate-pulse">
                    Get Ready!
                  </div>
                  <p className="text-xl font-bold text-slate-500">First question incoming...</p>
                </div>
              </div>
            )}

            {hostStage === 'question' && currentHostQuestion && (
              <HostQuestionView
                question={currentHostQuestion}
                questionIndex={hostQuestionIndex}
                totalQuestions={hostSession.totalQuestions}
                answersReceived={hostAnswersReceived}
                totalParticipants={hostParticipants.length}
                onTimeUp={handleHostQuestionTimeUp}
              />
            )}

            {hostStage === 'results' && (
              <HostAnswerDistribution
                distribution={distributionData}
                correctOptionId={correctOptionId}
                totalAnswers={totalAnswersSubmitted}
                onNext={handleHostShowLeaderboard}
              />
            )}

            {hostStage === 'leaderboard' && (
              <HostLeaderboard
                leaderboard={hostLeaderboard}
                currentQuestionIndex={hostQuestionIndex}
                totalQuestions={hostSession.totalQuestions}
                onNextQuestion={handleHostNextQuestion}
                onEndQuiz={handleHostEndQuiz}
              />
            )}

            {hostStage === 'podium' && (
              <HostPodium
                sessionId={hostSession.sessionId}
                podium={podiumData}
                leaderboard={hostLeaderboard}
                onViewAnalytics={() => {
                  setAnalyticsSessionId(hostSession.sessionId);
                  setCurrentView('analytics');
                }}
                onRestart={() => setCurrentView('dashboard')}
              />
            )}
          </div>
        )}

        {/* VIEW 4: Player Join */}
        {currentView === 'join' && (
          <PlayerJoin
            initialPin={initialPin}
            onJoined={handlePlayerJoined}
          />
        )}

        {/* VIEW 5: Player Live Arena */}
        {currentView === 'player_arena' && playerSession && (
          <div>
            {playerStage === 'lobby' && (
              <PlayerLobby
                participant={playerSession.participant}
                quizTitle={playerSession.quizTitle}
                pin={playerSession.pin}
              />
            )}

            {playerStage === 'countdown' && (
              <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center text-center">
                <div className="space-y-4 animate-scale-up">
                  <div className="text-6xl sm:text-7xl font-black text-indigo-600 dark:text-indigo-400 font-heading animate-bounce">
                    Ready!
                  </div>
                  <p className="text-sm font-bold text-slate-500">Look at the big screen!</p>
                </div>
              </div>
            )}

            {playerStage === 'question' && currentPlayerQuestion && (
              <PlayerQuestionView
                question={currentPlayerQuestion}
                questionIndex={playerQuestionIndex}
                totalQuestions={playerSession.totalQuestions}
                hasSubmitted={hasSubmittedAnswer}
                selectedOptionId={selectedOptionId}
                onSubmitAnswer={handlePlayerSubmitAnswer}
              />
            )}

            {playerStage === 'feedback' && (
              <PlayerAnswerFeedback
                isCorrect={answerFeedback.isCorrect}
                pointsEarned={answerFeedback.pointsEarned}
                streak={answerFeedback.streak}
                currentRank={playerSession.participant.rank}
                totalScore={playerSession.participant.score}
              />
            )}

            {playerStage === 'leaderboard' && (
              <PlayerLeaderboard
                leaderboard={playerLeaderboard}
                myParticipantId={playerSession.participant.id}
              />
            )}

            {playerStage === 'podium' && (
              <PlayerPodium
                myParticipantId={playerSession.participant.id}
                podium={podiumData}
                leaderboard={playerLeaderboard}
                onPlayAgain={handleLeaveGame}
              />
            )}
          </div>
        )}

        {/* VIEW 6: Analytics Dashboard */}
        {currentView === 'analytics' && (
          <AnalyticsDashboard
            sessionId={analyticsSessionId}
            onBack={() => {
              if (hostSession) {
                setCurrentView('host_arena');
              } else {
                setCurrentView('dashboard');
              }
            }}
          />
        )}
      </main>
    </div>
  );
};
