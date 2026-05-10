const DOM = {
    screens: {
        landing: document.getElementById('landing-screen'),
        quiz: document.getElementById('quiz-screen'),
        result: document.getElementById('result-screen'),
        review: document.getElementById('review-screen'),
        profile: document.getElementById('profile-screen'),
        db: document.getElementById('db-screen'),
        instructions: document.getElementById('instructions-screen')
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
        home: document.getElementById('home-btn'),
        exitQuiz: document.getElementById('exit-quiz-btn'),
        timerToggle: document.getElementById('timer-toggle'),
        dbBack: document.getElementById('db-back-btn'),
        viewDB: document.getElementById('view-db-btn'),
        srs: document.getElementById('srs-btn'),
        srsCount: document.getElementById('srs-count'),
        howTo: document.getElementById('how-to-btn'),
        instructionsBack: document.getElementById('instructions-back-btn'),
        weakSpot: document.getElementById('weak-spot-container'),
        performanceBars: document.getElementById('performance-bars'),
        tierGrid: document.getElementById('tier-analysis-grid'),
        reviewFavoritesBtn: document.getElementById('review-favorites-btn')
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
        explanationText: document.getElementById('explanation-text'),
        tierBadge: document.getElementById('tier-badge'),
        pearlContainer: document.getElementById('pearl-container'),
        referenceText: document.getElementById('reference-text'),
        selectionGuard: document.getElementById('selection-guard')
    },
    review: {
        qNum: document.getElementById('review-q-num'),
        qTotal: document.getElementById('review-q-total'),
        category: document.getElementById('review-category-badge'),
        question: document.getElementById('review-question-text'),
        options: document.getElementById('review-options-container'),
        explanationText: document.getElementById('review-explanation-text'),
        pearlContainer: document.getElementById('review-pearl-container'),
        referenceText: document.getElementById('review-reference-text')
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
    },
    db: {
        total: document.getElementById('db-total-questions'),
        distBars: document.getElementById('db-distribution-bars')
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
let isTimerEnabled = true;

// Persistent Data
let userStats = JSON.parse(localStorage.getItem('endoStats')) || { totalSolved: 0, totalCorrect: 0, highScore: 0 };
let favorites = JSON.parse(localStorage.getItem('endoFavorites')) || [];
let customQuestions = JSON.parse(localStorage.getItem('endoCustomQuestions')) || [];

let srsData = JSON.parse(localStorage.getItem('endoSRS')) || {};
let domainStats = JSON.parse(localStorage.getItem('endoDomainStats')) || {};
let tierStats = JSON.parse(localStorage.getItem('endoTierStats')) || {};

let categoryStats = {};
let isReviewFavoritesMode = false;
let isSRSMode = false;
let isAnswerSelected = false;

const QUESTIONS_URL = 'questions.json';

function saveStats() {
    localStorage.setItem('endoStats', JSON.stringify(userStats));
    localStorage.setItem('endoFavorites', JSON.stringify(favorites));
    localStorage.setItem('endoCustomQuestions', JSON.stringify(customQuestions));
    localStorage.setItem('endoDomainStats', JSON.stringify(domainStats));
    localStorage.setItem('endoTierStats', JSON.stringify(tierStats));
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
        updateDBDashboard();
        updateSRSCount();
        updateWeakSpotAlert();
    } catch (error) {
        console.error("Failed to load questions from web source.", error);
        DOM.btns.start.textContent = "Error Loading Questions";
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

function updateDBDashboard() {
    DOM.db.total.textContent = allQuestions.length;
    const dist = {};
    allQuestions.forEach(q => {
        const cat = q.category || 'General';
        dist[cat] = (dist[cat] || 0) + 1;
    });
    
    DOM.db.distBars.innerHTML = '';
    const sortedCats = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    const maxCount = allQuestions.length > 0 ? Math.max(...Object.values(dist)) : 0;
    
    sortedCats.forEach(([cat, count]) => {
        const percentage = (count / maxCount) * 100;
        const barHtml = `
            <div class="k-map-item" style="margin-bottom: 16px; text-align: left; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div class="k-map-info" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #e2e8f0; font-weight: 600; font-size: 0.95rem;">${cat}</span>
                    <span style="color: #60a5fa; font-weight: 700; background: rgba(59, 130, 246, 0.1); padding: 2px 8px; border-radius: 6px; font-size: 0.85rem;">${count}</span>
                </div>
                <div class="k-bar-bg" style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                    <div class="k-bar-fill" style="width: ${percentage}%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); transition: width 1s ease;"></div>
                </div>
            </div>
        `;
        DOM.db.distBars.insertAdjacentHTML('beforeend', barHtml);
    });
}

function startNewRound() {
    if (allQuestions.length === 0) {
        alert("Wait a moment! We're still loading the clinical database. 🧪");
        loadQuestions();
        return;
    }
    isReviewFavoritesMode = false;
    isTimerEnabled = DOM.btns.timerToggle.checked;
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

function startSRSRound() {
    isSRSMode = true;
    isReviewFavoritesMode = false;
    isTimerEnabled = DOM.btns.timerToggle.checked;
    
    const today = new Date().toISOString().split('T')[0];
    const dueQuestions = allQuestions.filter(q => {
        const id = getQuestionId(q);
        const data = srsData[id];
        return !data || data.nextReview <= today;
    });
    
    if (dueQuestions.length === 0) {
        alert("No questions due for review today! Great job staying ahead. 🎯");
        return;
    }
    
    const shuffled = shuffleArray(dueQuestions);
    currentRoundQuestions = shuffled.slice(0, 10);
    
    currentQuestionIndex = 0;
    score = 0;
    wrongQuestions = [];
    categoryStats = {};
    
    switchScreen('quiz');
    loadQuestion();
}

function startWeakDomainDrill(category) {
    isSRSMode = false;
    isReviewFavoritesMode = false;
    isTimerEnabled = DOM.btns.timerToggle.checked;
    
    // Filter by category
    let pool = allQuestions.filter(q => (q.category || 'General') === category);
    
    // Weighted sort: Prioritize questions with low repetitions or low easeFactor in SRS
    pool.sort((a, b) => {
        const dataA = srsData[getQuestionId(a)] || { repetitions: 0, easeFactor: 2.5 };
        const dataB = srsData[getQuestionId(b)] || { repetitions: 0, easeFactor: 2.5 };
        
        // Priority 1: Unseen/Low repetitions
        if (dataA.repetitions !== dataB.repetitions) return dataA.repetitions - dataB.repetitions;
        // Priority 2: Harder questions (lower ease factor)
        return dataA.easeFactor - dataB.easeFactor;
    });
    
    currentRoundQuestions = pool.slice(0, 10);
    
    currentQuestionIndex = 0;
    score = 0;
    wrongQuestions = [];
    categoryStats = {};
    
    switchScreen('quiz');
    loadQuestion();
}

function updateWeakSpotAlert() {
    const threshold = 0.65;
    const weakDomains = Object.entries(domainStats)
        .filter(([_, s]) => s.attempts >= 3 && (s.correct / s.attempts) < threshold)
        .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts));
        
    DOM.btns.weakSpot.innerHTML = '';
    
    if (weakDomains.length > 0) {
        const [cat, stats] = weakDomains[0];
        const accuracy = Math.round((stats.correct / stats.attempts) * 100);
        
        const alertHtml = `
            <div class="weak-spot-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; padding: 20px; text-align: left; animation: fadeIn 0.5s ease-out; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <h3 style="margin: 0; color: #f59e0b; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">⚠️ Drill Your Weak Spots</h3>
                    <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">${accuracy}% Accuracy</span>
                </div>
                <p style="margin: 0 0 16px 0; color: #e2e8f0; font-size: 0.9rem; line-height: 1.5;">You're struggling with <strong>${cat}</strong>. Take a focused drill to master this domain.</p>
                <button id="drill-btn" class="primary-btn" style="background: #f59e0b; border: none; padding: 10px 16px; font-size: 0.9rem; width: auto;">Start ${cat} Drill</button>
            </div>
        `;
        DOM.btns.weakSpot.innerHTML = alertHtml;
        document.getElementById('drill-btn').addEventListener('click', () => startWeakDomainDrill(cat));
    }
}

function getQuestionId(q) {
    // Simple hash of question text for ID
    let hash = 0;
    const str = q.question;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return 'q_' + hash;
}

function updateSRS(q, isCorrect) {
    const id = getQuestionId(q);
    let data = srsData[id] || {
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: new Date().toISOString().split('T')[0]
    };
    
    if (isCorrect) {
        if (data.repetitions === 0) data.interval = 1;
        else if (data.repetitions === 1) data.interval = 6;
        else data.interval = Math.round(data.interval * data.easeFactor);
        
        data.repetitions++;
        // Quality factor 5 for correct
        data.easeFactor = Math.max(1.3, data.easeFactor + (0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02)));
    } else {
        data.repetitions = 0;
        data.interval = 1;
        // Quality factor 0 for wrong
        data.easeFactor = Math.max(1.3, data.easeFactor + (0.1 - (5 - 0) * (0.08 + (5 - 0) * 0.02)));
    }
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + data.interval);
    data.nextReview = nextDate.toISOString().split('T')[0];
    
    srsData[id] = data;
    localStorage.setItem('endoSRS', JSON.stringify(srsData));
}

function updateSRSCount() {
    const today = new Date().toISOString().split('T')[0];
    const dueCount = allQuestions.filter(q => {
        const id = getQuestionId(q);
        const data = srsData[id];
        return !data || data.nextReview <= today;
    }).length;
    DOM.btns.srsCount.textContent = dueCount;
    DOM.btns.srs.disabled = dueCount === 0;
}

function switchScreen(screenName) {
    Object.values(DOM.screens).forEach(screen => screen.classList.remove('active'));
    DOM.screens[screenName].classList.add('active');
}

function renderQuestionImage(q, questionElement) {
    const existingImg = questionElement.parentElement.querySelector('.question-image');
    if (existingImg) existingImg.remove();
    
    if (q.image) {
        const img = document.createElement('img');
        img.src = q.image;
        img.alt = q.imageAlt || 'Question Image';
        img.className = 'question-image';
        img.style.cssText = 'width:100%; border-radius:12px; margin-bottom:1.5rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.3); cursor: zoom-in;';
        
        // Handle missing images gracefully
        img.onerror = () => {
            console.warn(`Image failed to load: ${q.image}`);
            img.remove();
        };

        // Add simple zoom on click
        img.onclick = () => {
            if (img.style.maxHeight === 'none') {
                img.style.maxHeight = '300px';
                img.style.objectFit = 'cover';
            } else {
                img.style.maxHeight = 'none';
                img.style.objectFit = 'contain';
            }
        };
        
        questionElement.parentElement.insertBefore(img, questionElement);
    }
}

function loadQuestion() {
    if (!currentRoundQuestions || currentRoundQuestions.length === 0) {
        console.error("No questions in current round.");
        switchScreen('landing');
        return;
    }
    const q = currentRoundQuestions[currentQuestionIndex];
    if (!q) return;

    DOM.quiz.qNum.textContent = currentQuestionIndex + 1;
    DOM.quiz.category.textContent = q.category || 'General';
    DOM.quiz.question.textContent = q.question;
    renderQuestionImage(q, DOM.quiz.question);
    DOM.quiz.options.innerHTML = '';
    DOM.quiz.explanationContainer.classList.add('hidden');
    DOM.quiz.selectionGuard.style.opacity = '0';
    isAnswerSelected = false;
    updateFavoriteUI(q);

    if (q.tier) {
        DOM.quiz.tierBadge.textContent = `Tier ${q.tier}: ${getTierLabel(q.tier)}`;
        DOM.quiz.tierBadge.classList.remove('hidden');
    } else {
        DOM.quiz.tierBadge.classList.add('hidden');
    }
    
    q.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option');
        btn.dataset.index = index;
        
        const mainDiv = document.createElement('div');
        mainDiv.classList.add('option-main');
        mainDiv.textContent = optText;
        btn.appendChild(mainDiv);
        
        const reasoningDiv = document.createElement('div');
        reasoningDiv.classList.add('option-reasoning', 'hidden');
        btn.appendChild(reasoningDiv);
        
        btn.addEventListener('click', handleOptionClick);
        DOM.quiz.options.appendChild(btn);
    });
    
    if (isTimerEnabled) {
        DOM.quiz.timerContainer.style.display = 'block';
        startTimer();
    } else {
        DOM.quiz.timerContainer.style.display = 'none';
        clearInterval(timerInterval);
    }
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = TIME_LIMIT;
    updateTimerUI();
    
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
    if (timeLeft <= 10) DOM.quiz.timerContainer.classList.add('warning');
}

function showExplanation(q) {
    if (q.explanation) {
        DOM.quiz.explanationText.innerHTML = ''; // Clear redundant text
        
        if (q.clinicalPearl) {
            DOM.quiz.pearlContainer.innerHTML = `💎 <strong>Clinical Pearl:</strong> ${q.clinicalPearl}`;
            DOM.quiz.pearlContainer.classList.remove('hidden');
        } else {
            DOM.quiz.pearlContainer.classList.add('hidden');
        }
        
        if (q.reference) {
            DOM.quiz.referenceText.innerHTML = `📚 <strong>Reference:</strong> ${q.reference}`;
            DOM.quiz.referenceText.classList.remove('hidden');
        } else {
            DOM.quiz.referenceText.classList.add('hidden');
        }
        
        DOM.quiz.explanationContainer.classList.remove('hidden');
    }
}

function updateFavoriteUI(q) {
    const isFav = favorites.some(f => f.question === q.question);
    DOM.btns.favorite.classList.toggle('active', isFav);
    DOM.btns.favorite.textContent = isFav ? '★ Saved' : '☆ Save';
}

function toggleFavorite() {
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
    DOM.profile.favCount.textContent = favorites.length;
    DOM.btns.reviewFavorites.disabled = favorites.length === 0;
}

function handleOptionClick(e) {
    clearInterval(timerInterval);
    const selectedBtn = e.target.closest('.option');
    const selectedIndex = parseInt(selectedBtn.dataset.index);
    const q = currentRoundQuestions[currentQuestionIndex];
    
    const optionBtns = DOM.quiz.options.querySelectorAll('.option');
    const reasonings = parseDistractorReasoning(q.explanation);
    const correctReasoning = extractCorrectReasoning(q.explanation);

    optionBtns.forEach((btn, index) => {
        btn.disabled = true;
        if (index === q.correctAnswer) btn.classList.add('correct');
        if (index === selectedIndex && selectedIndex !== q.correctAnswer) btn.classList.add('wrong');
        
        const reasoningDiv = btn.querySelector('.option-reasoning');
        const letter = String.fromCharCode(65 + index);
        
        if (index === q.correctAnswer) {
            reasoningDiv.innerHTML = `<strong>Correct:</strong> ${correctReasoning}`;
        } else {
            reasoningDiv.innerHTML = `<strong>Note:</strong> ${reasonings[letter] || 'Incorrect option.'}`;
        }
        reasoningDiv.classList.remove('hidden');
    });
    
    if (selectedIndex === q.correctAnswer) {
        score++;
        triggerConfettiMini();
        const cat = q.category || 'General';
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
        categoryStats[cat].total++;
        categoryStats[cat].correct++;
        
        // Persist domain stats
        if (!domainStats[cat]) domainStats[cat] = { attempts: 0, correct: 0 };
        domainStats[cat].attempts++;
        domainStats[cat].correct++;
        
        // Persist tier stats
        const tier = q.tier || 1;
        if (!tierStats[tier]) tierStats[tier] = { attempts: 0, correct: 0 };
        tierStats[tier].attempts++;
        tierStats[tier].correct++;
        
        updateSRS(q, true);
    } else {
        wrongQuestions.push({
            questionData: q,
            selectedOption: selectedIndex
        });
        const cat = q.category || 'General';
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
        categoryStats[cat].total++;
        
        // Persist domain stats
        if (!domainStats[cat]) domainStats[cat] = { attempts: 0, correct: 0 };
        domainStats[cat].attempts++;
        
        // Persist tier stats
        const tier = q.tier || 1;
        if (!tierStats[tier]) tierStats[tier] = { attempts: 0, correct: 0 };
        tierStats[tier].attempts++;
        
        updateSRS(q, false);
    }
    
    saveStats();
    updateSRSCount();
    updateWeakSpotAlert();
    showExplanation(q);
    isAnswerSelected = true;
}

function parseDistractorReasoning(explanation) {
    const reasonings = {};
    const incorrectPart = explanation.split('INCORRECT:')[1] || explanation.split('Why others are wrong:')[1] || '';
    const letters = ['A', 'B', 'C', 'D'];
    
    let hasLetters = letters.some(l => incorrectPart.includes(`${l} - `));
    
    if (hasLetters) {
        letters.forEach((letter) => {
            const startMarker = `${letter} - `;
            let startIdx = incorrectPart.indexOf(startMarker);
            if (startIdx !== -1) {
                startIdx += startMarker.length;
                let endIdx = -1;
                const markers = ['A - ', 'B - ', 'C - ', 'D - ', 'CLINICAL PEARL:', 'REFERENCE:'];
                markers.forEach(marker => {
                    const mIdx = incorrectPart.indexOf(marker, startIdx);
                    if (mIdx !== -1 && (endIdx === -1 || mIdx < endIdx)) endIdx = mIdx;
                });
                let text = endIdx === -1 ? incorrectPart.substring(startIdx).trim() : incorrectPart.substring(startIdx, endIdx).trim();
                reasonings[letter] = text.replace(/[;.,]$/, '');
            }
        });
    } else if (incorrectPart.trim()) {
        // This is a safety measure so they aren't empty
        letters.forEach(letter => {
            reasonings[letter] = incorrectPart.split('CLINICAL PEARL:')[0].split('REFERENCE:')[0].trim();
        });
    }
    return reasonings;
}

function extractCorrectReasoning(explanation) {
    let text = explanation.split('INCORRECT:')[0].replace('CORRECT:', '').trim();
    // Also remove Pearl and Reference if they leaked into the CORRECT block
    text = text.split('CLINICAL PEARL:')[0].split('REFERENCE:')[0].trim();
    return text || 'Correct Answer.';
}

function handleTimeUp() {
    const optionBtns = DOM.quiz.options.querySelectorAll('.option');
    optionBtns.forEach(btn => btn.disabled = true);
    const q = currentRoundQuestions[currentQuestionIndex];
    optionBtns[q.correctAnswer].classList.add('correct');
    wrongQuestions.push({ questionData: q, selectedOption: -1 });
    const cat = q.category || 'General';
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
    categoryStats[cat].total++;
    
    // Persist domain stats
    if (!domainStats[cat]) domainStats[cat] = { attempts: 0, correct: 0 };
    domainStats[cat].attempts++;
    
    // Persist tier stats
    const tier = q.tier || 1;
    if (!tierStats[tier]) tierStats[tier] = { attempts: 0, correct: 0 };
    tierStats[tier].attempts++;
    
    saveStats();
    updateWeakSpotAlert();
    showExplanation(q);
    isAnswerSelected = true;
}

function handleNextQuestion() {
    if (!isAnswerSelected) {
        DOM.quiz.options.classList.remove('shake');
        void DOM.quiz.options.offsetWidth; // Trigger reflow
        DOM.quiz.options.classList.add('shake');
        DOM.quiz.selectionGuard.style.opacity = '1';
        setTimeout(() => { DOM.quiz.selectionGuard.style.opacity = '0'; }, 3000);
        return;
    }
    
    currentQuestionIndex++;
    if (currentQuestionIndex < currentRoundQuestions.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    userStats.totalSolved += currentRoundQuestions.length;
    userStats.totalCorrect += score;
    if (score > userStats.highScore) userStats.highScore = score;
    saveStats();
    
    DOM.result.score.textContent = score;
    DOM.result.message.textContent = score >= 7 ? "Excellent performance!" : score >= 5 ? "Good effort!" : "Keep practicing!";
    
    renderKnowledgeMap();
    switchScreen('result');
    if (score >= 8) triggerConfettiFull();
}

function renderKnowledgeMap() {
    DOM.result.kMapBars.innerHTML = '';
    const percentages = [];
    for (const cat in categoryStats) {
        const stats = categoryStats[cat];
        const pct = Math.round((stats.correct / stats.total) * 100);
        percentages.push(pct);
        const barHtml = `<div class="k-bar-container"><div class="k-bar-header"><span>${cat}</span><span>${pct}% (${stats.correct}/${stats.total})</span></div><div class="k-bar-bg"><div class="k-bar-fill" style="width: 0%"></div></div></div>`;
        DOM.result.kMapBars.insertAdjacentHTML('beforeend', barHtml);
    }
    setTimeout(() => {
        const fills = DOM.result.kMapBars.querySelectorAll('.k-bar-fill');
        fills.forEach((fill, i) => fill.style.width = `${percentages[i]}%`);
    }, 50);
    
    if (wrongQuestions.length > 0) DOM.btns.reviewErrors.classList.remove('hidden');
    else DOM.btns.reviewErrors.classList.add('hidden');
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
    renderQuestionImage(q, DOM.review.question);
    DOM.review.options.innerHTML = '';
    
    const reasonings = parseDistractorReasoning(q.explanation);
    const correctReasoning = extractCorrectReasoning(q.explanation);

    q.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option');
        btn.disabled = true;
        if (index === q.correctAnswer) btn.classList.add('correct');
        else if (index === errorData.selectedOption) btn.classList.add('wrong');

        const mainDiv = document.createElement('div');
        mainDiv.classList.add('option-main');
        mainDiv.textContent = optText;
        btn.appendChild(mainDiv);

        const reasoningDiv = document.createElement('div');
        reasoningDiv.classList.add('option-reasoning');
        const letter = String.fromCharCode(65 + index);
        if (index === q.correctAnswer) reasoningDiv.innerHTML = `<strong>Correct:</strong> ${correctReasoning}`;
        else reasoningDiv.innerHTML = `<strong>Note:</strong> ${reasonings[letter] || 'Incorrect option.'}`;
        btn.appendChild(reasoningDiv);
        DOM.review.options.appendChild(btn);
    });
    
    if (q.explanation) {
        if (q.clinicalPearl) {
            DOM.review.pearlContainer.innerHTML = `💎 <strong>Clinical Pearl:</strong> ${q.clinicalPearl}`;
            DOM.review.pearlContainer.classList.remove('hidden');
        } else { DOM.review.pearlContainer.classList.add('hidden'); }
        if (q.reference) {
            DOM.review.referenceText.innerHTML = `📚 <strong>Reference:</strong> ${q.reference}`;
            DOM.review.referenceText.classList.remove('hidden');
        } else { DOM.review.referenceText.classList.add('hidden'); }
    }
    updateFavoriteUI(q);
}

function handleReviewNext() {
    if (reviewIndex < wrongQuestions.length - 1) {
        reviewIndex++;
        loadReviewQuestion();
    }
}

function handleReviewPrev() {
    if (reviewIndex > 0) {
        reviewIndex--;
        loadReviewQuestion();
    }
}

function updateProfile() {
    DOM.profile.totalSolved.textContent = userStats.totalSolved;
    DOM.profile.highScore.textContent = userStats.highScore;
    const accuracy = userStats.totalSolved > 0 ? Math.round((userStats.totalCorrect / userStats.totalSolved) * 100) : 0;
    DOM.profile.avgAccuracy.textContent = `${accuracy}%`;
    DOM.profile.favCount.textContent = favorites.length;
    DOM.btns.reviewFavorites.disabled = favorites.length === 0;
    renderDomainPerformance();
    renderTierAnalysis();
}

function renderTierAnalysis() {
    DOM.btns.tierGrid.innerHTML = '';
    const tiers = [1, 2, 3, 4];
    
    tiers.forEach(tier => {
        const stats = tierStats[tier] || { attempts: 0, correct: 0 };
        const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
        const label = getTierLabel(tier);
        
        // Color coding based on accuracy
        let color = '#64748b'; // Gray for no data
        if (stats.attempts > 0) {
            if (accuracy >= 80) color = '#10b981'; // Green
            else if (accuracy >= 65) color = '#3b82f6'; // Blue
            else if (accuracy >= 40) color = '#f59e0b'; // Amber
            else color = '#ef4444'; // Red
        }
        
        const cellHtml = `
            <div class="tier-cell" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; text-align: center;">
                <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Tier ${tier}</div>
                <div style="font-size: 0.9rem; color: #e2e8f0; font-weight: 700; margin-bottom: 8px;">${label}</div>
                <div style="font-size: 1.4rem; font-weight: 800; color: ${color};">${accuracy}%</div>
                <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">${stats.correct}/${stats.attempts} Correct</div>
            </div>
        `;
        DOM.btns.tierGrid.insertAdjacentHTML('beforeend', cellHtml);
    });
}

function renderDomainPerformance() {
    DOM.btns.performanceBars.innerHTML = '';
    
    // Sort domains by accuracy ascending
    const sortedStats = Object.entries(domainStats)
        .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts));
        
    if (sortedStats.length === 0) {
        DOM.btns.performanceBars.innerHTML = '<p style="color: #64748b; font-size: 0.9rem; margin-top: 10px;">Complete some quizzes to see your performance map!</p>';
        return;
    }
    
    sortedStats.forEach(([cat, stats]) => {
        const accuracy = Math.round((stats.correct / stats.attempts) * 100);
        const color = accuracy < 65 ? '#f59e0b' : '#3b82f6'; // Amber for weak, blue for mastery
        
        const barHtml = `
            <div class="k-map-item" style="margin-bottom: 16px; text-align: left; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div class="k-map-info" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #e2e8f0; font-weight: 600; font-size: 0.95rem;">${cat}</span>
                    <span style="color: ${color}; font-weight: 700; background: ${color}1A; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem;">${accuracy}% (${stats.correct}/${stats.attempts})</span>
                </div>
                <div class="k-bar-bg" style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; position: relative;">
                    <!-- 65% Threshold Line -->
                    <div style="position: absolute; left: 65%; top: 0; width: 1px; height: 100%; background: rgba(255,255,255,0.3); z-index: 2; border-left: 1px dashed rgba(255,255,255,0.5);"></div>
                    <div class="k-bar-fill" style="width: ${accuracy}%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, ${color}, #8b5cf6); transition: width 1s ease;"></div>
                </div>
            </div>
        `;
        DOM.btns.performanceBars.insertAdjacentHTML('beforeend', barHtml);
    });
}

async function refreshQuestionBank() {
    if (!navigator.onLine) {
        try {
            const reg = await navigator.serviceWorker.ready;
            if ('sync' in reg) {
                await reg.sync.register('refresh-questions');
                alert("You are offline. Refresh queued — your question bank will update automatically when you're back online! 📡");
            } else {
                alert("You are offline and your browser doesn't support background sync. Please try again when connected.");
            }
        } catch (err) {
            console.error("Background sync registration failed", err);
            alert("Offline: Could not queue refresh.");
        }
        return;
    }

    DOM.btns.refreshBank.textContent = "Updating...";
    DOM.btns.refreshBank.disabled = true;
    
    try {
        await loadQuestions();
        setTimeout(() => {
            DOM.btns.refreshBank.textContent = "Refresh Question Bank";
            DOM.btns.refreshBank.disabled = false;
            updateProfile();
            alert("Question bank updated successfully! 🚀");
        }, 1000);
    } catch (error) {
        DOM.btns.refreshBank.textContent = "Refresh Question Bank";
        DOM.btns.refreshBank.disabled = false;
        alert("Refresh failed. Please check your connection.");
    }
}

function exitQuizHalfway() {
    if (confirm("Are you sure you want to exit? Your progress for this round will be saved in your profile stats.")) {
        userStats.totalSolved += currentQuestionIndex;
        userStats.totalCorrect += score;
        saveStats();
        switchScreen('landing');
    }
}

function triggerConfettiMini() {
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#3b82f6', '#8b5cf6', '#10b981'] });
}

function triggerConfettiFull() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random() - 0.2, y: Math.random() - 0.3 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random() + 0.2, y: Math.random() - 0.3 } }));
    }, 250);
}

function getTierLabel(tier) {
    const labels = { 1: 'Recall', 2: 'Application', 3: 'Clinical Reasoning', 4: 'Expert Synthesis' };
    return labels[tier] || 'Specialist';
}

// Event Listeners
function initListeners() {
    if (DOM.btns.start) DOM.btns.start.addEventListener('click', startNewRound);
    if (DOM.btns.next) DOM.btns.next.addEventListener('click', handleNextQuestion);
    if (DOM.btns.restart) DOM.btns.restart.addEventListener('click', startNewRound);
    if (DOM.btns.reviewErrors) DOM.btns.reviewErrors.addEventListener('click', initReview);
    if (DOM.btns.reviewNext) DOM.btns.reviewNext.addEventListener('click', handleReviewNext);
    if (DOM.btns.reviewPrev) DOM.btns.reviewPrev.addEventListener('click', handleReviewPrev);
    if (DOM.btns.backToResults) DOM.btns.backToResults.addEventListener('click', () => switchScreen('result'));
    if (DOM.btns.viewProfile) DOM.btns.viewProfile.addEventListener('click', () => { updateProfile(); switchScreen('profile'); });
    if (DOM.btns.profileBack) DOM.btns.profileBack.addEventListener('click', () => switchScreen('landing'));
    if (DOM.btns.favorite) DOM.btns.favorite.addEventListener('click', toggleFavorite);
    if (DOM.btns.refreshBank) DOM.btns.refreshBank.addEventListener('click', refreshQuestionBank);
    if (DOM.btns.viewDB) DOM.btns.viewDB.addEventListener('click', () => { updateDBDashboard(); switchScreen('db'); });
    if (DOM.btns.dbBack) DOM.btns.dbBack.addEventListener('click', () => switchScreen('landing'));
    if (DOM.btns.home) DOM.btns.home.addEventListener('click', () => switchScreen('landing'));
    if (DOM.btns.exitQuiz) DOM.btns.exitQuiz.addEventListener('click', exitQuizHalfway);
    if (DOM.btns.srs) DOM.btns.srs.addEventListener('click', startSRSRound);
    if (DOM.btns.howTo) DOM.btns.howTo.addEventListener('click', () => switchScreen('instructions'));
    if (DOM.btns.instructionsBack) DOM.btns.instructionsBack.addEventListener('click', () => switchScreen('landing'));
    if (DOM.btns.reviewFavoritesBtn) DOM.btns.reviewFavoritesBtn.addEventListener('click', startFavoritesRound);
}

// Initialize
function init() {
    initListeners();
    if (DOM.btns.start) {
        DOM.btns.start.textContent = "Loading...";
        DOM.btns.start.disabled = true;
    }
    loadQuestions();
}

init();
