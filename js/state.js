export const state = {
  allQuestions: [],
  currentRoundQuestions: [],
  currentQuestionIndex: 0,
  score: 0,
  wrongQuestions: [],
  reviewIndex: 0,
  timerInterval: null,
  timeLeft: 60,
  TIME_LIMIT: 60,
  isTimerEnabled: true,

  // Persistent Data
  userStats: { totalSolved: 0, totalCorrect: 0, highScore: 0 },
  favorites: [],
  customQuestions: [],
  srsData: {},
  domainStats: {},
  tierStats: {},

  // Session Data
  categoryStats: {},
  isReviewFavoritesMode: false,
  isSRSMode: false,
  isAnswerSelected: false,
};
