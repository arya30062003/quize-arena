import { Quiz } from '../types';

export const SAMPLE_QUIZZES: Quiz[] = [
  {
    id: 'quiz-web-dev-101',
    title: 'Web Dev & JavaScript Mastery',
    description: 'Test your knowledge on modern JavaScript, React ecosystem, and web performance!',
    category: 'Technology',
    authorId: 'admin-sample',
    isPublic: true,
    totalQuestions: 6,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    questions: [
      {
        id: 'q1',
        quizId: 'quiz-web-dev-101',
        questionText: 'Which HTTP status code signifies "I\'m a teapot"?',
        timeLimit: 20,
        points: 100,
        order: 1,
        options: [
          { id: 'opt1', text: '404 Not Found', isCorrect: false },
          { id: 'opt2', text: '418 I\'m a teapot', isCorrect: true },
          { id: 'opt3', text: '503 Service Unavailable', isCorrect: false },
          { id: 'opt4', text: '429 Too Many Requests', isCorrect: false }
        ]
      },
      {
        id: 'q2',
        quizId: 'quiz-web-dev-101',
        questionText: 'What is the output of `typeof NaN` in JavaScript?',
        timeLimit: 15,
        points: 100,
        order: 2,
        options: [
          { id: 'opt1', text: '"undefined"', isCorrect: false },
          { id: 'opt2', text: '"nan"', isCorrect: false },
          { id: 'opt3', text: '"number"', isCorrect: true },
          { id: 'opt4', text: '"object"', isCorrect: false }
        ]
      },
      {
        id: 'q3',
        quizId: 'quiz-web-dev-101',
        questionText: 'Which React hook is used to optimize expensive computations by caching values?',
        timeLimit: 20,
        points: 100,
        order: 3,
        options: [
          { id: 'opt1', text: 'useEffect', isCorrect: false },
          { id: 'opt2', text: 'useCallback', isCorrect: false },
          { id: 'opt3', text: 'useMemo', isCorrect: true },
          { id: 'opt4', text: 'useRef', isCorrect: false }
        ]
      },
      {
        id: 'q4',
        quizId: 'quiz-web-dev-101',
        questionText: 'What transport protocol does Socket.IO default to upgrading toward?',
        timeLimit: 20,
        points: 100,
        order: 4,
        options: [
          { id: 'opt1', text: 'WebSockets', isCorrect: true },
          { id: 'opt2', text: 'HTTP Long-Polling', isCorrect: false },
          { id: 'opt3', text: 'WebRTC DataChannel', isCorrect: false },
          { id: 'opt4', text: 'Server-Sent Events', isCorrect: false }
        ]
      },
      {
        id: 'q5',
        quizId: 'quiz-web-dev-101',
        questionText: 'Which CSS property enables GPU-accelerated layer creation without layout reflows?',
        timeLimit: 20,
        points: 100,
        order: 5,
        options: [
          { id: 'opt1', text: 'transform: translateZ(0)', isCorrect: true },
          { id: 'opt2', text: 'float: left', isCorrect: false },
          { id: 'opt3', text: 'display: block', isCorrect: false },
          { id: 'opt4', text: 'margin: auto', isCorrect: false }
        ]
      },
      {
        id: 'q6',
        quizId: 'quiz-web-dev-101',
        questionText: 'What does INP stand for in Google Core Web Vitals?',
        timeLimit: 20,
        points: 100,
        order: 6,
        options: [
          { id: 'opt1', text: 'Index Node Priority', isCorrect: false },
          { id: 'opt2', text: 'Interaction to Next Paint', isCorrect: true },
          { id: 'opt3', text: 'Initial Network Packet', isCorrect: false },
          { id: 'opt4', text: 'Internal Node Process', isCorrect: false }
        ]
      }
    ]
  },
  {
    id: 'quiz-science-space-202',
    title: 'Science, Space & Tech Explorers',
    description: 'Fascinating questions about astrophysics, quantum mechanics, and technological breakthroughs.',
    category: 'Science',
    authorId: 'admin-sample',
    isPublic: true,
    totalQuestions: 5,
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
    questions: [
      {
        id: 'sq1',
        quizId: 'quiz-science-space-202',
        questionText: 'What is the closest star system to our Solar System?',
        timeLimit: 15,
        points: 100,
        order: 1,
        options: [
          { id: 'sopt1', text: 'Sirius', isCorrect: false },
          { id: 'sopt2', text: 'Alpha Centauri', isCorrect: true },
          { id: 'sopt3', text: 'Betelgeuse', isCorrect: false },
          { id: 'sopt4', text: 'Andromeda', isCorrect: false }
        ]
      },
      {
        id: 'sq2',
        quizId: 'quiz-science-space-202',
        questionText: 'What does CRISPR technology primarily edit?',
        timeLimit: 20,
        points: 100,
        order: 2,
        options: [
          { id: 'sopt1', text: 'DNA sequences', isCorrect: true },
          { id: 'sopt2', text: 'Silicon chips', isCorrect: false },
          { id: 'sopt3', text: 'Cellular membranes', isCorrect: false },
          { id: 'sopt4', text: 'Atomic nuclei', isCorrect: false }
        ]
      },
      {
        id: 'sq3',
        quizId: 'quiz-science-space-202',
        questionText: 'Which space telescope released its first operational deep field images in July 2022?',
        timeLimit: 15,
        points: 100,
        order: 3,
        options: [
          { id: 'sopt1', text: 'Hubble Space Telescope', isCorrect: false },
          { id: 'sopt2', text: 'James Webb Space Telescope', isCorrect: true },
          { id: 'sopt3', text: 'Kepler Observatory', isCorrect: false },
          { id: 'sopt4', text: 'Spitzer Space Telescope', isCorrect: false }
        ]
      },
      {
        id: 'sq4',
        quizId: 'quiz-science-space-202',
        questionText: 'What is the fastest speed possible in the vacuum of the universe?',
        timeLimit: 15,
        points: 100,
        order: 4,
        options: [
          { id: 'sopt1', text: 'Speed of Sound (~343 m/s)', isCorrect: false },
          { id: 'sopt2', text: 'Escape Velocity (~11.2 km/s)', isCorrect: false },
          { id: 'sopt3', text: 'Speed of Light (~299,792 km/s)', isCorrect: true },
          { id: 'sopt4', text: 'Hyperdrive velocity', isCorrect: false }
        ]
      },
      {
        id: 'sq5',
        quizId: 'quiz-science-space-202',
        questionText: 'Who coined the term "Artificial Intelligence" in 1956?',
        timeLimit: 20,
        points: 100,
        order: 5,
        options: [
          { id: 'sopt1', text: 'Alan Turing', isCorrect: false },
          { id: 'sopt2', text: 'John McCarthy', isCorrect: true },
          { id: 'sopt3', text: 'Claude Shannon', isCorrect: false },
          { id: 'sopt4', text: 'Ada Lovelace', isCorrect: false }
        ]
      }
    ]
  }
];
