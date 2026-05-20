import { state } from "./state.js";
import { DOM } from "./dom.js";

export function getQuestionId(q) {
  // Simple hash of question text for ID
  let hash = 0;
  const str = q.question;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "q_" + hash;
}

export function updateSRS(q, isCorrect) {
  const id = getQuestionId(q);
  let data = state.srsData[id] || {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    nextReview: new Date().toISOString().split("T")[0],
  };

  if (isCorrect) {
    if (data.repetitions === 0) data.interval = 1;
    else if (data.repetitions === 1) data.interval = 6;
    else data.interval = Math.round(data.interval * data.easeFactor);

    data.repetitions++;
    // Quality factor 5 for correct
    data.easeFactor = Math.max(
      1.3,
      data.easeFactor + (0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02)),
    );
  } else {
    data.repetitions = 0;
    data.interval = 1;
    // Quality factor 0 for wrong
    data.easeFactor = Math.max(
      1.3,
      data.easeFactor + (0.1 - (5 - 0) * (0.08 + (5 - 0) * 0.02)),
    );
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + data.interval);
  data.nextReview = nextDate.toISOString().split("T")[0];

  state.srsData[id] = data;
}

export function updateSRSCount() {
  const today = new Date().toISOString().split("T")[0];
  const dueCount = state.allQuestions.filter((q) => {
    const id = getQuestionId(q);
    const data = state.srsData[id];
    return !data || data.nextReview <= today;
  }).length;
  if (DOM.btns.srsCount) DOM.btns.srsCount.textContent = dueCount;
  if (DOM.btns.srs) DOM.btns.srs.disabled = dueCount === 0;
}
