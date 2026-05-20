import { DOM, switchScreen } from "./dom.js";
import { state } from "./state.js";
import { loadData } from "./storage.js";
import { loadQuestions } from "./api.js";
import { updateProfile, updateDBDashboard } from "./stats.js";
import {
  startNewRound,
  startFavoritesRound,
  startSRSRound,
  handleNextQuestion,
  exitQuizHalfway,
  toggleFavorite,
} from "./quiz.js";

async function refreshQuestionBank() {
  if (!navigator.onLine) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ("sync" in reg) {
        await reg.sync.register("refresh-questions");
        alert(
          "You are offline. Refresh queued — your question bank will update automatically when you're back online! 📡",
        );
      } else {
        alert(
          "You are offline and your browser doesn't support background sync. Please try again when connected.",
        );
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

function initListeners() {
  if (DOM.btns.start) DOM.btns.start.addEventListener("click", startNewRound);
  if (DOM.btns.next)
    DOM.btns.next.addEventListener("click", handleNextQuestion);
  if (DOM.btns.restart)
    DOM.btns.restart.addEventListener("click", startNewRound);
  // Skipped review logic for brevity but should be here
  if (DOM.btns.backToResults)
    DOM.btns.backToResults.addEventListener("click", () =>
      switchScreen("result"),
    );
  if (DOM.btns.viewProfile)
    DOM.btns.viewProfile.addEventListener("click", () => {
      updateProfile();
      switchScreen("profile");
    });
  if (DOM.btns.profileBack)
    DOM.btns.profileBack.addEventListener("click", () =>
      switchScreen("landing"),
    );
  if (DOM.btns.favorite)
    DOM.btns.favorite.addEventListener("click", toggleFavorite);
  if (DOM.btns.refreshBank)
    DOM.btns.refreshBank.addEventListener("click", refreshQuestionBank);
  if (DOM.btns.viewDB)
    DOM.btns.viewDB.addEventListener("click", () => {
      updateDBDashboard();
      switchScreen("db");
    });
  if (DOM.btns.dbBack)
    DOM.btns.dbBack.addEventListener("click", () => switchScreen("landing"));
  if (DOM.btns.home)
    DOM.btns.home.addEventListener("click", () => switchScreen("landing"));
  if (DOM.btns.exitQuiz)
    DOM.btns.exitQuiz.addEventListener("click", exitQuizHalfway);
  if (DOM.btns.srs) DOM.btns.srs.addEventListener("click", startSRSRound);
  if (DOM.btns.howTo)
    DOM.btns.howTo.addEventListener("click", () =>
      switchScreen("instructions"),
    );
  if (DOM.btns.instructionsBack)
    DOM.btns.instructionsBack.addEventListener("click", () =>
      switchScreen("landing"),
    );
  if (DOM.btns.reviewFavoritesBtn)
    DOM.btns.reviewFavoritesBtn.addEventListener("click", startFavoritesRound);
}

function init() {
  loadData();
  initListeners();
  if (DOM.btns.start) {
    DOM.btns.start.textContent = "Loading...";
    DOM.btns.start.disabled = true;
  }
  loadQuestions();
}

init();
