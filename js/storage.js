import { state } from "./state.js";

export function loadData() {
  state.userStats = JSON.parse(localStorage.getItem("endoStats")) || {
    totalSolved: 0,
    totalCorrect: 0,
    highScore: 0,
  };
  state.favorites = JSON.parse(localStorage.getItem("endoFavorites")) || [];
  state.customQuestions =
    JSON.parse(localStorage.getItem("endoCustomQuestions")) || [];
  state.srsData = JSON.parse(localStorage.getItem("endoSRS")) || {};
  state.domainStats = JSON.parse(localStorage.getItem("endoDomainStats")) || {};
  state.tierStats = JSON.parse(localStorage.getItem("endoTierStats")) || {};
}

export function saveStats() {
  localStorage.setItem("endoStats", JSON.stringify(state.userStats));
  localStorage.setItem("endoFavorites", JSON.stringify(state.favorites));
  localStorage.setItem(
    "endoCustomQuestions",
    JSON.stringify(state.customQuestions),
  );
  localStorage.setItem("endoDomainStats", JSON.stringify(state.domainStats));
  localStorage.setItem("endoTierStats", JSON.stringify(state.tierStats));
}
