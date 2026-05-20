export const DOM = {
  screens: {
    landing: document.getElementById("landing-screen"),
    quiz: document.getElementById("quiz-screen"),
    result: document.getElementById("result-screen"),
    review: document.getElementById("review-screen"),
    profile: document.getElementById("profile-screen"),
    db: document.getElementById("db-screen"),
    instructions: document.getElementById("instructions-screen"),
  },
  btns: {
    start: document.getElementById("start-btn"),
    next: document.getElementById("next-btn"),
    restart: document.getElementById("restart-btn"),
    reviewErrors: document.getElementById("review-errors-btn"),
    reviewPrev: document.getElementById("review-prev-btn"),
    reviewNext: document.getElementById("review-next-btn"),
    backToResults: document.getElementById("back-to-results-btn"),
    viewProfile: document.getElementById("view-profile-btn"),
    profileBack: document.getElementById("profile-back-btn"),
    reviewFavorites: document.getElementById("review-favorites-btn"),
    refreshBank: document.getElementById("refresh-bank-btn"),
    favorite: document.getElementById("favorite-btn"),
    home: document.getElementById("home-btn"),
    exitQuiz: document.getElementById("exit-quiz-btn"),
    timerToggle: document.getElementById("timer-toggle"),
    dbBack: document.getElementById("db-back-btn"),
    viewDB: document.getElementById("view-db-btn"),
    srs: document.getElementById("srs-btn"),
    srsCount: document.getElementById("srs-count"),
    howTo: document.getElementById("how-to-btn"),
    instructionsBack: document.getElementById("instructions-back-btn"),
    weakSpot: document.getElementById("weak-spot-container"),
    performanceBars: document.getElementById("performance-bars"),
    tierGrid: document.getElementById("tier-analysis-grid"),
    reviewFavoritesBtn: document.getElementById("review-favorites-btn"),
  },
  quiz: {
    qNum: document.getElementById("current-q-num"),
    category: document.getElementById("category-badge"),
    question: document.getElementById("question-text"),
    options: document.getElementById("options-container"),
    timerBar: document.getElementById("timer-bar"),
    timerText: document.getElementById("timer-text"),
    timerContainer: document.querySelector(".timer-container"),
    explanationContainer: document.getElementById("explanation-container"),
    explanationText: document.getElementById("explanation-text"),
    tierBadge: document.getElementById("tier-badge"),
    pearlContainer: document.getElementById("pearl-container"),
    referenceText: document.getElementById("reference-text"),
    selectionGuard: document.getElementById("selection-guard"),
  },
  review: {
    qNum: document.getElementById("review-q-num"),
    qTotal: document.getElementById("review-q-total"),
    category: document.getElementById("review-category-badge"),
    question: document.getElementById("review-question-text"),
    options: document.getElementById("review-options-container"),
    explanationText: document.getElementById("review-explanation-text"),
    pearlContainer: document.getElementById("review-pearl-container"),
    referenceText: document.getElementById("review-reference-text"),
  },
  profile: {
    totalSolved: document.getElementById("stat-total-solved"),
    highScore: document.getElementById("stat-high-score"),
    avgAccuracy: document.getElementById("stat-avg-accuracy"),
    favCount: document.getElementById("fav-count"),
  },
  result: {
    score: document.getElementById("final-score"),
    message: document.getElementById("result-message"),
    kMapBars: document.getElementById("knowledge-map-bars"),
  },
  db: {
    total: document.getElementById("db-total-questions"),
    distBars: document.getElementById("db-distribution-bars"),
  },
};

export function switchScreen(screenName) {
  Object.values(DOM.screens).forEach((screen) =>
    screen.classList.remove("active"),
  );
  DOM.screens[screenName].classList.add("active");
}

export function triggerConfettiMini() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: ["#3b82f6", "#8b5cf6", "#10b981"],
  });
}

export function triggerConfettiFull() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 50 * (timeLeft / duration);
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: Math.random() - 0.2, y: Math.random() - 0.3 },
      }),
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: Math.random() + 0.2, y: Math.random() - 0.3 },
      }),
    );
  }, 250);
}

export function getTierLabel(tier) {
  const labels = {
    1: "Recall",
    2: "Application",
    3: "Clinical Reasoning",
    4: "Expert Synthesis",
  };
  return labels[tier] || "Specialist";
}
