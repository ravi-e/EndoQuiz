const DOM = {
    screens: {
        landing: document.getElementById('landing-screen'),
        quiz: document.getElementById('quiz-screen'),
        result: document.getElementById('result-screen'),
        review: document.getElementById('review-screen'),
        profile: document.getElementById('profile-screen')
    },
    btns: {
        start: document.getElementById('start-btn'),
        next: document.getElementById('next-btn'),
        restart: document.getElementById('restart-btn'),
        reviewErrors: document.getElementById('review-errors-btn'),
        reviewPrev: document.getElementById('review-prev-btn'),
        reviewNext: document.getElementById('review-next-btn'),
        backToResults: document.getElementById('back-to-results-btn'),
        viewProfile: document.getElementById('view-profile-btn'),
        profileBack: document.getElementById('profile-back-btn'),
        reviewFavorites: document.getElementById('review-favorites-btn'),
        refreshBank: document.getElementById('refresh-bank-btn'),
        favorite: document.getElementById('favorite-btn'),
        reviewFavorite: document.getElementById('review-favorite-btn'),
        home: document.getElementById('home-btn'),
        exitQuiz: document.getElementById('exit-quiz-btn')
    },
    quiz: {
        qNum: document.getElementById('current-q-num'),
        category: document.getElementById('category-badge'),
        question: document.getElementById('question-text'),
        options: document.getElementById('options-container'),
        timerBar: document.getElementById('timer-bar'),
        timerText: document.getElementById('timer-text'),
        timerContainer: document.querySelector('.timer-container'),
        explanationContainer: document.getElementById('explanation-container'),
        explanationText: document.getElementById('explanation-text')
    },
    review: {
        qNum: document.getElementById('review-q-num'),
        qTotal: document.getElementById('review-q-total'),
        category: document.getElementById('review-category-badge'),
        question: document.getElementById('review-question-text'),
        options: document.getElementById('review-options-container'),
        explanationText: document.getElementById('review-explanation-text')
    },
    profile: {
        totalSolved: document.getElementById('stat-total-solved'),
        highScore: document.getElementById('stat-high-score'),
        avgAccuracy: document.getElementById('stat-avg-accuracy'),
        favCount: document.getElementById('fav-count')
    },
    result: {
        score: document.getElementById('final-score'),
        message: document.getElementById('result-message'),
        kMapBars: document.getElementById('knowledge-map-bars')
    }
};

let allQuestions = [];
let currentRoundQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let wrongQuestions = [];
let reviewIndex = 0;
let timerInterval;
let timeLeft = 60;
const TIME_LIMIT = 60;

// Persistent Data
let userStats = JSON.parse(localStorage.getItem('endoStats')) || { totalSolved: 0, totalCorrect: 0, highScore: 0 };
let favorites = JSON.parse(localStorage.getItem('endoFavorites')) || [];
let customQuestions = JSON.parse(localStorage.getItem('endoCustomQuestions')) || [];

let categoryStats = {};
let isReviewFavoritesMode = false;

const QUESTIONS_URL = 'questions.json';

function saveStats() {
    localStorage.setItem('endoStats', JSON.stringify(userStats));
    localStorage.setItem('endoFavorites', JSON.stringify(favorites));
    localStorage.setItem('endoCustomQuestions', JSON.stringify(customQuestions));
}

// Fetch questions from external source
async function loadQuestions() {
    try {
        const response = await fetch(QUESTIONS_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        const baseQuestions = await response.json();
        allQuestions = [...baseQuestions, ...customQuestions];
        
        DOM.btns.start.disabled = false;
        DOM.btns.start.textContent = "Start Quiz";
    } catch (error) {
        console.error("Failed to load questions from web source. Ensure you are running this on a web server.", error);
        DOM.btns.start.textContent = "Error Loading Questions";
        DOM.btns.start.disabled = true;
    }
}

// Utility: Shuffle array
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startNewRound() {
    isReviewFavoritesMode = false;
    // Select 10 random questions
    const shuffled = shuffleArray(allQuestions);
    currentRoundQuestions = shuffled.slice(0, 10);
    
    currentQuestionIndex = 0;
    score = 0;
    wrongQuestions = [];
    categoryStats = {};
    
    switchScreen('quiz');
    loadQuestion();
}

function startFavoritesRound() {
    isReviewFavoritesMode = true;
    const shuffled = shuffleArray(favorites);
    currentRoundQuestions = shuffled.slice(0, 10);
    
    currentQuestionIndex = 0;
    score = 0;
    wrongQuestions = [];
    categoryStats = {};
    
    switchScreen('quiz');
    loadQuestion();
}

function switchScreen(screenName) {
    Object.values(DOM.screens).forEach(screen => {
        screen.classList.remove('active');
    });
    DOM.screens[screenName].classList.add('active');
}

function loadQuestion() {
    const q = currentRoundQuestions[currentQuestionIndex];
    
    // Reset UI
    DOM.quiz.qNum.textContent = currentQuestionIndex + 1;
    DOM.quiz.category.textContent = q.category || 'General';
    DOM.quiz.question.textContent = q.question;
    DOM.quiz.options.innerHTML = '';
    DOM.quiz.explanationContainer.classList.add('hidden');
    DOM.btns.next.classList.add('hidden');
    updateFavoriteUI(q);
    
    // Create options
    q.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option');
        btn.textContent = optText;
        btn.dataset.index = index;
        btn.addEventListener('click', handleOptionClick);
        DOM.quiz.options.appendChild(btn);
    });
    
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = TIME_LIMIT;
    updateTimerUI();
    
    // Reset bar animation by re-triggering reflow
    DOM.quiz.timerBar.style.width = '100%';
    DOM.quiz.timerContainer.classList.remove('warning');
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeUp();
        }
    }, 1000);
}

function updateTimerUI() {
    DOM.quiz.timerText.textContent = `${timeLeft}s`;
    const percentage = (timeLeft / TIME_LIMIT) * 100;
    DOM.quiz.timerBar.style.width = `${percentage}%`;
    
    if (timeLeft <= 10) {
        DOM.quiz.timerContainer.classList.add('warning');
    }
}

function showExplanation(q) {
    if (q.explanation) {
        DOM.quiz.explanationText.innerHTML = q.explanation.replace(/Correct Answer:/g, '<strong>Correct Answer:</strong>').replace(/Why others are wrong:/g, '<br><br><strong>Why others are wrong:</strong>');
        DOM.quiz.explanationContainer.classList.remove('hidden');
    }
}

function updateFavoriteUI(q) {
    const isFav = favorites.some(f => f.question === q.question);
    DOM.btns.favorite.classList.toggle('active', isFav);
    DOM.btns.reviewFavorite.classList.toggle('active', isFav);
    DOM.btns.favorite.textContent = isFav ? '★ Saved' : '☆ Save';
    DOM.btns.reviewFavorite.textContent = isFav ? '★ Saved' : '☆ Save';
}

function toggleFavorite() {
    // Get current question based on screen
    const q = DOM.screens.quiz.classList.contains('active') ? 
              currentRoundQuestions[currentQuestionIndex] : 
              wrongQuestions[reviewIndex].questionData;
              
    const isFav = favorites.some(f => f.question === q.question);
    if (isFav) {
        favorites = favorites.filter(f => f.question !== q.question);
    } else {
        favorites.push(q);
    }
    saveStats();
    updateFavoriteUI(q);
    
    // Update profile count if active
    DOM.profile.favCount.textContent = favorites.length;
    DOM.btns.reviewFavorites.disabled = favorites.length === 0;
}

function handleOptionClick(e) {
    clearInterval(timerInterval); // Stop timer
    const selectedBtn = e.target;
    const selectedIndex = parseInt(selectedBtn.dataset.index);
    const q = currentRoundQuestions[currentQuestionIndex];
    
    // Disable all options
    const optionBtns = document.querySelectorAll('.option');
    optionBtns.forEach(btn => btn.disabled = true);
    
    if (selectedIndex === q.correctAnswer) {
        // Correct
        selectedBtn.classList.add('correct');
        score++;
        triggerConfettiMini();
        const cat = q.category || 'General';
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
        categoryStats[cat].total++;
        categoryStats[cat].correct++;
    } else {
        // Wrong
        selectedBtn.classList.add('wrong');
        // Highlight correct answer
        optionBtns[q.correctAnswer].classList.add('correct');
        wrongQuestions.push({
            questionData: q,
            selectedOption: selectedIndex
        });
        const cat = q.category || 'General';
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
        categoryStats[cat].total++;
    }
    
    showExplanation(q);
    DOM.btns.next.classList.remove('hidden');
}

function handleTimeUp() {
    // Disable all options
    const optionBtns = document.querySelectorAll('.option');
    optionBtns.forEach(btn => btn.disabled = true);
    
    const q = currentRoundQuestions[currentQuestionIndex];
    // Highlight correct answer
    optionBtns[q.correctAnswer].classList.add('correct');
    
    wrongQuestions.push({
        questionData: q,
        selectedOption: -1 // Indicates time up
    });
    
    const cat = q.category || 'General';
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
    categoryStats[cat].total++;
    
    showExplanation(q);
    DOM.btns.next.classList.remove('hidden');
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentRoundQuestions.length) {
        loadQuestion();
    } else {
        endQuiz();
    }
}

function endQuiz() {
    switchScreen('result');
    DOM.result.score.textContent = score;
    
    let message = '';
    if (score === currentRoundQuestions.length) {
        message = 'Perfect! You are completely ready for the exam!';
        triggerConfettiMassive();
    } else if (score >= currentRoundQuestions.length * 0.8) {
        message = 'Outstanding job! Almost perfect.';
        triggerConfettiMassive();
    } else if (score >= currentRoundQuestions.length * 0.6) {
        message = 'Good effort! A little more review and you\'ll nail it.';
    } else {
        message = 'Don\'t give up! Keep practicing and reviewing the concepts.';
    }
    
    DOM.result.message.textContent = message;
    
    // Update and Save Global Stats
    userStats.totalSolved += currentRoundQuestions.length;
    userStats.totalCorrect += score;
    if (score > userStats.highScore) userStats.highScore = score;
    saveStats();
    
    // Render Knowledge Map
    DOM.result.kMapBars.innerHTML = '';
    const percentages = [];
    
    for (const cat in categoryStats) {
        const stats = categoryStats[cat];
        const pct = Math.round((stats.correct / stats.total) * 100);
        percentages.push(pct);
        
        const barHtml = `
            <div class="k-bar-container">
                <div class="k-bar-header">
                    <span>${cat}</span>
                    <span>${pct}% (${stats.correct}/${stats.total})</span>
                </div>
                <div class="k-bar-bg">
                    <div class="k-bar-fill" style="width: 0%"></div>
                </div>
            </div>
        `;
        DOM.result.kMapBars.insertAdjacentHTML('beforeend', barHtml);
    }
    
    // Trigger animations for all bars at once
    setTimeout(() => {
        const fills = DOM.result.kMapBars.querySelectorAll('.k-bar-fill');
        fills.forEach((fill, index) => {
            fill.style.width = `${percentages[index]}%`;
        });
    }, 50);
    
    if (wrongQuestions.length > 0) {
        DOM.btns.reviewErrors.classList.remove('hidden');
    } else {
        DOM.btns.reviewErrors.classList.add('hidden');
    }
}

function initReview() {
    reviewIndex = 0;
    DOM.review.qTotal.textContent = wrongQuestions.length;
    switchScreen('review');
    loadReviewQuestion();
}

function loadReviewQuestion() {
    const errorData = wrongQuestions[reviewIndex];
    const q = errorData.questionData;
    
    DOM.review.qNum.textContent = reviewIndex + 1;
    DOM.review.category.textContent = q.category || 'General';
    DOM.review.question.textContent = q.question;
    DOM.review.options.innerHTML = '';
    
    q.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option');
        btn.textContent = optText;
        btn.disabled = true;
        
        if (index === q.correctAnswer) {
            btn.classList.add('correct');
        } else if (index === errorData.selectedOption) {
            btn.classList.add('wrong');
        }
        
        DOM.review.options.appendChild(btn);
    });
    
    if (q.explanation) {
        DOM.review.explanationText.innerHTML = q.explanation.replace(/Correct Answer:/g, '<strong>Correct Answer:</strong>').replace(/Why others are wrong:/g, '<br><br><strong>Why others are wrong:</strong>');
    }
    
    updateFavoriteUI(q);
    
    DOM.btns.reviewPrev.style.display = reviewIndex > 0 ? 'block' : 'none';
    DOM.btns.reviewNext.style.display = reviewIndex < wrongQuestions.length - 1 ? 'block' : 'none';
}

function reviewNext() {
    if (reviewIndex < wrongQuestions.length - 1) {
        reviewIndex++;
        loadReviewQuestion();
    }
}

function reviewPrev() {
    if (reviewIndex > 0) {
        reviewIndex--;
        loadReviewQuestion();
    }
}

function showProfile() {
    DOM.profile.totalSolved.textContent = userStats.totalSolved;
    DOM.profile.highScore.textContent = userStats.highScore;
    const accuracy = userStats.totalSolved > 0 ? Math.round((userStats.totalCorrect / userStats.totalSolved) * 100) : 0;
    DOM.profile.avgAccuracy.textContent = `${accuracy}%`;
    DOM.profile.favCount.textContent = favorites.length;
    DOM.btns.reviewFavorites.disabled = favorites.length === 0;
    switchScreen('profile');
}

async function refreshQuestionBank() {
    DOM.btns.refreshBank.textContent = "Fetching...";
    DOM.btns.refreshBank.disabled = true;
    try {
        // Fetch from the centralized JSON database URL (simulated here with QUESTIONS_URL)
        const response = await fetch(QUESTIONS_URL);
        const newQuestions = await response.json();
        
        let added = 0;
        newQuestions.forEach(nq => {
            if (!allQuestions.some(q => q.question === nq.question)) {
                customQuestions.push(nq);
                allQuestions.push(nq);
                added++;
            }
        });
        saveStats();
        alert(added > 0 ? `Successfully fetched ${added} new questions!` : `Your question bank is already up to date.`);
    } catch(e) {
        alert("Failed to fetch new questions.");
    }
    DOM.btns.refreshBank.textContent = "Refresh Question Bank";
    DOM.btns.refreshBank.disabled = false;
}

function exitQuizHalfway() {
    clearInterval(timerInterval);
    // Save partial progress
    const isAnswerLocked = !DOM.btns.next.classList.contains('hidden');
    const solvedThisRound = isAnswerLocked ? currentQuestionIndex + 1 : currentQuestionIndex;
    
    if (solvedThisRound > 0) {
        userStats.totalSolved += solvedThisRound;
        userStats.totalCorrect += score;
        if (score > userStats.highScore) userStats.highScore = score;
        saveStats();
    }
    
    switchScreen('landing');
}

function triggerConfettiMini() {
    confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399']
    });
}

function triggerConfettiMassive() {
    var duration = 3 * 1000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#3b82f6', '#a78bfa', '#60a5fa']
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#3b82f6', '#a78bfa', '#60a5fa']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// Event Listeners
DOM.btns.start.addEventListener('click', startNewRound);
DOM.btns.next.addEventListener('click', nextQuestion);
DOM.btns.restart.addEventListener('click', startNewRound);
DOM.btns.reviewErrors.addEventListener('click', initReview);
DOM.btns.reviewNext.addEventListener('click', reviewNext);
DOM.btns.reviewPrev.addEventListener('click', reviewPrev);
DOM.btns.backToResults.addEventListener('click', () => switchScreen('result'));
DOM.btns.viewProfile.addEventListener('click', showProfile);
DOM.btns.profileBack.addEventListener('click', () => switchScreen('landing'));
DOM.btns.favorite.addEventListener('click', toggleFavorite);
DOM.btns.reviewFavorite.addEventListener('click', toggleFavorite);
DOM.btns.reviewFavorites.addEventListener('click', startFavoritesRound);
DOM.btns.refreshBank.addEventListener('click', refreshQuestionBank);
DOM.btns.home.addEventListener('click', () => switchScreen('landing'));
DOM.btns.exitQuiz.addEventListener('click', exitQuizHalfway);

// Initialize
DOM.btns.start.textContent = "Loading...";
DOM.btns.start.disabled = true;
loadQuestions();
