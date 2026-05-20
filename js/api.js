import { state } from "./state.js";
import { DOM } from "./dom.js";
import { updateDBDashboard, updateWeakSpotAlert } from "./stats.js";
import { updateSRSCount } from "./srs.js";

const QUESTIONS_URL = "questions.json";

export async function loadQuestions() {
  try {
    const response = await fetch(QUESTIONS_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    const baseQuestions = await response.json();
    state.allQuestions = [...baseQuestions, ...state.customQuestions];

    if (DOM.btns.start) {
      DOM.btns.start.disabled = false;
      DOM.btns.start.textContent = "Start Quiz";
    }
    updateDBDashboard();
    updateSRSCount();
    updateWeakSpotAlert();
  } catch (error) {
    console.error("Failed to load questions from web source.", error);
    if (DOM.btns.start) {
      DOM.btns.start.textContent = "Error Loading Questions";
    }
  }
}
