import { state } from "./state.js";
import {
  DOM,
  switchScreen,
  triggerConfettiMini,
  triggerConfettiFull,
} from "./dom.js";
import { updateSRS, updateSRSCount, getQuestionId } from "./srs.js";
import { updateWeakSpotAlert } from "./stats.js";
import { saveStats } from "./storage.js";

// Utility: Shuffle array
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function startNewRound() {
  if (state.allQuestions.length === 0) {
    alert("Wait a moment! We're still loading the clinical database. 🧪");
    return;
  }
  state.isReviewFavoritesMode = false;
  state.isTimerEnabled = DOM.btns.timerToggle.checked;
  const shuffled = shuffleArray(state.allQuestions);
  state.currentRoundQuestions = shuffled.slice(0, 10);

  state.currentQuestionIndex = 0;
  state.score = 0;
  state.wrongQuestions = [];
  state.categoryStats = {};

  switchScreen("quiz");
  loadQuestion();
}

export function startFavoritesRound() {
  state.isReviewFavoritesMode = true;
  const shuffled = shuffleArray(state.favorites);
  state.currentRoundQuestions = shuffled.slice(0, 10);

  state.currentQuestionIndex = 0;
  state.score = 0;
  state.wrongQuestions = [];
  state.categoryStats = {};

  switchScreen("quiz");
  loadQuestion();
}

export function startSRSRound() {
  state.isSRSMode = true;
  state.isReviewFavoritesMode = false;
  state.isTimerEnabled = DOM.btns.timerToggle.checked;

  const today = new Date().toISOString().split("T")[0];
  const dueQuestions = state.allQuestions.filter((q) => {
    const id = getQuestionId(q);
    const data = state.srsData[id];
    return !data || data.nextReview <= today;
  });

  if (dueQuestions.length === 0) {
    alert("No questions due for review today! Great job staying ahead. 🎯");
    return;
  }

  const shuffled = shuffleArray(dueQuestions);
  state.currentRoundQuestions = shuffled.slice(0, 10);

  state.currentQuestionIndex = 0;
  state.score = 0;
  state.wrongQuestions = [];
  state.categoryStats = {};

  switchScreen("quiz");
  loadQuestion();
}

export function startWeakDomainDrill(category) {
  state.isSRSMode = false;
  state.isReviewFavoritesMode = false;
  state.isTimerEnabled = DOM.btns.timerToggle.checked;

  let pool = state.allQuestions.filter(
    (q) => (q.category || "General") === category,
  );
  pool.sort((a, b) => {
    const dataA = state.srsData[getQuestionId(a)] || {
      repetitions: 0,
      easeFactor: 2.5,
    };
    const dataB = state.srsData[getQuestionId(b)] || {
      repetitions: 0,
      easeFactor: 2.5,
    };
    if (dataA.repetitions !== dataB.repetitions)
      return dataA.repetitions - dataB.repetitions;
    return dataA.easeFactor - dataB.easeFactor;
  });

  state.currentRoundQuestions = pool.slice(0, 10);
  state.currentQuestionIndex = 0;
  state.score = 0;
  state.wrongQuestions = [];
  state.categoryStats = {};

  switchScreen("quiz");
  loadQuestion();
}

function renderQuestionImage(q, questionElement) {
  const existingImg =
    questionElement.parentElement.querySelector(".question-image");
  if (existingImg) existingImg.remove();

  if (q.image) {
    const img = document.createElement("img");
    img.src = q.image;
    img.alt = q.imageAlt || "Question Image";
    img.className = "question-image";
    img.style.cssText =
      "width:100%; border-radius:12px; margin-bottom:1.5rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.3); cursor: zoom-in;";
    img.onerror = () => {
      img.remove();
    };
    img.onclick = () => {
      if (img.style.maxHeight === "none") {
        img.style.maxHeight = "300px";
        img.style.objectFit = "cover";
      } else {
        img.style.maxHeight = "none";
        img.style.objectFit = "contain";
      }
    };
    questionElement.parentElement.insertBefore(img, questionElement);
  }
}

export function loadQuestion() {
  if (
    !state.currentRoundQuestions ||
    state.currentRoundQuestions.length === 0
  ) {
    switchScreen("landing");
    return;
  }
  const q = state.currentRoundQuestions[state.currentQuestionIndex];
  if (!q) return;

  DOM.quiz.qNum.textContent = state.currentQuestionIndex + 1;
  DOM.quiz.category.textContent = q.category || "General";
  DOM.quiz.question.textContent = q.question;
  renderQuestionImage(q, DOM.quiz.question);
  DOM.quiz.options.innerHTML = "";
  DOM.quiz.explanationContainer.classList.add("hidden");
  DOM.quiz.selectionGuard.style.opacity = "0";
  state.isAnswerSelected = false;
  updateFavoriteUI(q);

  if (q.tier) {
    DOM.quiz.tierBadge.textContent = `Tier ${q.tier}`;
    DOM.quiz.tierBadge.classList.remove("hidden");
  } else {
    DOM.quiz.tierBadge.classList.add("hidden");
  }

  q.options.forEach((optText, index) => {
    const btn = document.createElement("button");
    btn.classList.add("option");
    btn.dataset.index = index;

    const mainDiv = document.createElement("div");
    mainDiv.classList.add("option-main");
    mainDiv.textContent = optText;
    btn.appendChild(mainDiv);

    const reasoningDiv = document.createElement("div");
    reasoningDiv.classList.add("option-reasoning", "hidden");
    btn.appendChild(reasoningDiv);

    btn.addEventListener("click", handleOptionClick);
    DOM.quiz.options.appendChild(btn);
  });

  if (state.isTimerEnabled) {
    DOM.quiz.timerContainer.style.display = "block";
    startTimer();
  } else {
    DOM.quiz.timerContainer.style.display = "none";
    clearInterval(state.timerInterval);
  }
}

function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = state.TIME_LIMIT;
  updateTimerUI();
  DOM.quiz.timerBar.style.width = "100%";
  DOM.quiz.timerContainer.classList.remove("warning");

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerUI();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      handleTimeUp();
    }
  }, 1000);
}

function updateTimerUI() {
  DOM.quiz.timerText.textContent = `${state.timeLeft}s`;
  const percentage = (state.timeLeft / state.TIME_LIMIT) * 100;
  DOM.quiz.timerBar.style.width = `${percentage}%`;
  if (state.timeLeft <= 10) DOM.quiz.timerContainer.classList.add("warning");
}

function showExplanation(q) {
  if (q.explanation) {
    DOM.quiz.explanationText.innerHTML = "";
    if (q.clinicalPearl) {
      DOM.quiz.pearlContainer.innerHTML = `💎 <strong>Clinical Pearl:</strong> ${q.clinicalPearl}`;
      DOM.quiz.pearlContainer.classList.remove("hidden");
    } else {
      DOM.quiz.pearlContainer.classList.add("hidden");
    }

    if (q.reference) {
      const searchUrl = `https://duckduckgo.com/?q=!ducky+endodontics+${encodeURIComponent(
        q.reference,
      )}`;
      DOM.quiz.referenceText.innerHTML = `📚 <strong>Reference:</strong> <a href="${searchUrl}" target="_blank" style="color: #60a5fa; text-decoration: underline;">${q.reference}</a>`;
      DOM.quiz.referenceText.classList.remove("hidden");
    } else {
      DOM.quiz.referenceText.classList.add("hidden");
    }
    DOM.quiz.explanationContainer.classList.remove("hidden");
  }
}

export function updateFavoriteUI(q) {
  const isFav = state.favorites.some((f) => f.question === q.question);
  DOM.btns.favorite.classList.toggle("active", isFav);
  DOM.btns.favorite.textContent = isFav ? "★ Saved" : "☆ Save";
}

export function toggleFavorite() {
  const q = DOM.screens.quiz.classList.contains("active")
    ? state.currentRoundQuestions[state.currentQuestionIndex]
    : state.wrongQuestions[state.reviewIndex].questionData;

  const isFav = state.favorites.some((f) => f.question === q.question);
  if (isFav) {
    state.favorites = state.favorites.filter((f) => f.question !== q.question);
  } else {
    state.favorites.push(q);
  }
  saveStats();
  updateFavoriteUI(q);
  DOM.profile.favCount.textContent = state.favorites.length;
  DOM.btns.reviewFavorites.disabled = state.favorites.length === 0;
}

function handleOptionClick(e) {
  clearInterval(state.timerInterval);
  const selectedBtn = e.target.closest(".option");
  const selectedIndex = parseInt(selectedBtn.dataset.index);
  const q = state.currentRoundQuestions[state.currentQuestionIndex];

  const optionBtns = DOM.quiz.options.querySelectorAll(".option");
  const reasonings = parseDistractorReasoning(q.explanation || "");
  const correctReasoning = extractCorrectReasoning(q.explanation || "");

  optionBtns.forEach((btn, index) => {
    btn.disabled = true;
    if (index === q.correctAnswer) btn.classList.add("correct");
    if (index === selectedIndex && selectedIndex !== q.correctAnswer)
      btn.classList.add("wrong");

    const reasoningDiv = btn.querySelector(".option-reasoning");
    const letter = String.fromCharCode(65 + index);

    if (index === q.correctAnswer) {
      reasoningDiv.innerHTML = `<strong>Correct:</strong> ${correctReasoning}`;
    } else {
      reasoningDiv.innerHTML = `<strong>Note:</strong> ${
        reasonings[letter] || "Incorrect option."
      }`;
    }
    reasoningDiv.classList.remove("hidden");
  });

  if (selectedIndex === q.correctAnswer) {
    state.score++;
    triggerConfettiMini();
    const cat = q.category || "General";
    if (!state.categoryStats[cat])
      state.categoryStats[cat] = { total: 0, correct: 0 };
    state.categoryStats[cat].total++;
    state.categoryStats[cat].correct++;

    if (!state.domainStats[cat])
      state.domainStats[cat] = { attempts: 0, correct: 0 };
    state.domainStats[cat].attempts++;
    state.domainStats[cat].correct++;

    const tier = q.tier || 1;
    if (!state.tierStats[tier])
      state.tierStats[tier] = { attempts: 0, correct: 0 };
    state.tierStats[tier].attempts++;
    state.tierStats[tier].correct++;

    updateSRS(q, true);
  } else {
    state.wrongQuestions.push({
      questionData: q,
      selectedOption: selectedIndex,
    });
    const cat = q.category || "General";
    if (!state.categoryStats[cat])
      state.categoryStats[cat] = { total: 0, correct: 0 };
    state.categoryStats[cat].total++;

    if (!state.domainStats[cat])
      state.domainStats[cat] = { attempts: 0, correct: 0 };
    state.domainStats[cat].attempts++;

    const tier = q.tier || 1;
    if (!state.tierStats[tier])
      state.tierStats[tier] = { attempts: 0, correct: 0 };
    state.tierStats[tier].attempts++;

    updateSRS(q, false);
  }

  saveStats();
  updateSRSCount();
  updateWeakSpotAlert();
  showExplanation(q);
  state.isAnswerSelected = true;
}

function parseDistractorReasoning(explanation) {
  const reasonings = {};
  const incorrectPart =
    explanation.split("INCORRECT:")[1] ||
    explanation.split("Why others are wrong:")[1] ||
    "";
  const letters = ["A", "B", "C", "D"];
  let hasLetters = letters.some((l) => incorrectPart.includes(`${l} - `));
  if (hasLetters) {
    letters.forEach((letter) => {
      const startMarker = `${letter} - `;
      let startIdx = incorrectPart.indexOf(startMarker);
      if (startIdx !== -1) {
        startIdx += startMarker.length;
        let endIdx = -1;
        const markers = [
          "A - ",
          "B - ",
          "C - ",
          "D - ",
          "CLINICAL PEARL:",
          "REFERENCE:",
        ];
        markers.forEach((marker) => {
          const mIdx = incorrectPart.indexOf(marker, startIdx);
          if (mIdx !== -1 && (endIdx === -1 || mIdx < endIdx)) endIdx = mIdx;
        });
        let text =
          endIdx === -1
            ? incorrectPart.substring(startIdx).trim()
            : incorrectPart.substring(startIdx, endIdx).trim();
        reasonings[letter] = text.replace(/[;.,]$/, "");
      }
    });
  }
  return reasonings;
}

function extractCorrectReasoning(explanation) {
  let text = explanation.split("INCORRECT:")[0].replace("CORRECT:", "").trim();
  text = text.split("CLINICAL PEARL:")[0].split("REFERENCE:")[0].trim();
  return text || "Correct Answer.";
}

function handleTimeUp() {
  const optionBtns = DOM.quiz.options.querySelectorAll(".option");
  optionBtns.forEach((btn) => (btn.disabled = true));
  const q = state.currentRoundQuestions[state.currentQuestionIndex];
  optionBtns[q.correctAnswer].classList.add("correct");
  state.wrongQuestions.push({ questionData: q, selectedOption: -1 });

  const cat = q.category || "General";
  if (!state.categoryStats[cat])
    state.categoryStats[cat] = { total: 0, correct: 0 };
  state.categoryStats[cat].total++;
  if (!state.domainStats[cat])
    state.domainStats[cat] = { attempts: 0, correct: 0 };
  state.domainStats[cat].attempts++;

  saveStats();
  updateWeakSpotAlert();
  showExplanation(q);
  state.isAnswerSelected = true;
}

export function handleNextQuestion() {
  if (!state.isAnswerSelected) {
    DOM.quiz.options.classList.remove("shake");
    void DOM.quiz.options.offsetWidth;
    DOM.quiz.options.classList.add("shake");
    DOM.quiz.selectionGuard.style.opacity = "1";
    setTimeout(() => {
      DOM.quiz.selectionGuard.style.opacity = "0";
    }, 3000);
    return;
  }
  state.currentQuestionIndex++;
  if (state.currentQuestionIndex < state.currentRoundQuestions.length) {
    loadQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  state.userStats.totalSolved += state.currentRoundQuestions.length;
  state.userStats.totalCorrect += state.score;
  if (state.score > state.userStats.highScore)
    state.userStats.highScore = state.score;
  saveStats();

  DOM.result.score.textContent = state.score;
  DOM.result.message.textContent =
    state.score >= 7
      ? "Excellent performance!"
      : state.score >= 5
        ? "Good effort!"
        : "Keep practicing!";
  renderKnowledgeMap();
  switchScreen("result");
  if (state.score >= 8) triggerConfettiFull();
}

function renderKnowledgeMap() {
  DOM.result.kMapBars.innerHTML = "";
  const percentages = [];
  for (const cat in state.categoryStats) {
    const stats = state.categoryStats[cat];
    const pct = Math.round((stats.correct / stats.total) * 100);
    percentages.push(pct);
    const barHtml = `<div class="k-bar-container"><div class="k-bar-header"><span>${cat}</span><span>${pct}% (${stats.correct}/${stats.total})</span></div><div class="k-bar-bg"><div class="k-bar-fill" style="width: 0%"></div></div></div>`;
    DOM.result.kMapBars.insertAdjacentHTML("beforeend", barHtml);
  }
  setTimeout(() => {
    const fills = DOM.result.kMapBars.querySelectorAll(".k-bar-fill");
    fills.forEach((fill, i) => (fill.style.width = `${percentages[i]}%`));
  }, 50);

  if (state.wrongQuestions.length > 0)
    DOM.btns.reviewErrors.classList.remove("hidden");
  else DOM.btns.reviewErrors.classList.add("hidden");
}

export function exitQuizHalfway() {
  if (
    confirm(
      "Are you sure you want to exit? Your progress for this round will be saved in your profile stats.",
    )
  ) {
    state.userStats.totalSolved += state.currentQuestionIndex;
    state.userStats.totalCorrect += state.score;
    saveStats();
    switchScreen("landing");
  }
}
