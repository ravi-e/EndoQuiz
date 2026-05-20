import { state } from "./state.js";
import { DOM, getTierLabel } from "./dom.js";
import { startWeakDomainDrill } from "./quiz.js";

export function updateDBDashboard() {
  if (!DOM.db.total) return;
  DOM.db.total.textContent = state.allQuestions.length;
  const dist = {};
  state.allQuestions.forEach((q) => {
    const cat = q.category || "General";
    dist[cat] = (dist[cat] || 0) + 1;
  });

  DOM.db.distBars.innerHTML = "";
  const sortedCats = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const maxCount =
    state.allQuestions.length > 0 ? Math.max(...Object.values(dist)) : 0;

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
    DOM.db.distBars.insertAdjacentHTML("beforeend", barHtml);
  });
}

export function updateWeakSpotAlert() {
  const threshold = 0.65;
  const weakDomains = Object.entries(state.domainStats)
    .filter(([_, s]) => s.attempts >= 3 && s.correct / s.attempts < threshold)
    .sort(
      (a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts,
    );

  if (DOM.btns.weakSpot) DOM.btns.weakSpot.innerHTML = "";

  if (weakDomains.length > 0 && DOM.btns.weakSpot) {
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
    document
      .getElementById("drill-btn")
      .addEventListener("click", () => startWeakDomainDrill(cat));
  }
}

export function updateProfile() {
  DOM.profile.totalSolved.textContent = state.userStats.totalSolved;
  DOM.profile.highScore.textContent = state.userStats.highScore;
  const accuracy =
    state.userStats.totalSolved > 0
      ? Math.round(
          (state.userStats.totalCorrect / state.userStats.totalSolved) * 100,
        )
      : 0;
  DOM.profile.avgAccuracy.textContent = `${accuracy}%`;
  DOM.profile.favCount.textContent = state.favorites.length;
  DOM.btns.reviewFavorites.disabled = state.favorites.length === 0;
  renderDomainPerformance();
  renderTierAnalysis();
}

function renderTierAnalysis() {
  DOM.btns.tierGrid.innerHTML = "";
  const tiers = [1, 2, 3, 4];

  tiers.forEach((tier) => {
    const stats = state.tierStats[tier] || { attempts: 0, correct: 0 };
    const accuracy =
      stats.attempts > 0
        ? Math.round((stats.correct / stats.attempts) * 100)
        : 0;
    const label = getTierLabel(tier);

    let color = "#64748b";
    if (stats.attempts > 0) {
      if (accuracy >= 80) color = "#10b981";
      else if (accuracy >= 65) color = "#3b82f6";
      else if (accuracy >= 40) color = "#f59e0b";
      else color = "#ef4444";
    }

    const cellHtml = `
            <div class="tier-cell" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; text-align: center;">
                <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Tier ${tier}</div>
                <div style="font-size: 0.9rem; color: #e2e8f0; font-weight: 700; margin-bottom: 8px;">${label}</div>
                <div style="font-size: 1.4rem; font-weight: 800; color: ${color};">${accuracy}%</div>
                <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">${stats.correct}/${stats.attempts} Correct</div>
            </div>
        `;
    DOM.btns.tierGrid.insertAdjacentHTML("beforeend", cellHtml);
  });
}

function renderDomainPerformance() {
  DOM.btns.performanceBars.innerHTML = "";

  const sortedStats = Object.entries(state.domainStats).sort(
    (a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts,
  );

  if (sortedStats.length === 0) {
    DOM.btns.performanceBars.innerHTML =
      '<p style="color: #64748b; font-size: 0.9rem; margin-top: 10px;">Complete some quizzes to see your performance map!</p>';
    return;
  }

  sortedStats.forEach(([cat, stats]) => {
    const accuracy = Math.round((stats.correct / stats.attempts) * 100);
    const color = accuracy < 65 ? "#f59e0b" : "#3b82f6";

    const barHtml = `
            <div class="k-map-item" style="margin-bottom: 16px; text-align: left; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div class="k-map-info" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #e2e8f0; font-weight: 600; font-size: 0.95rem;">${cat}</span>
                    <span style="color: ${color}; font-weight: 700; background: ${color}1A; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem;">${accuracy}% (${stats.correct}/${stats.attempts})</span>
                </div>
                <div class="k-bar-bg" style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="position: absolute; left: 65%; top: 0; width: 1px; height: 100%; background: rgba(255,255,255,0.3); z-index: 2; border-left: 1px dashed rgba(255,255,255,0.5);"></div>
                    <div class="k-bar-fill" style="width: ${accuracy}%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, ${color}, #8b5cf6); transition: width 1s ease;"></div>
                </div>
            </div>
        `;
    DOM.btns.performanceBars.insertAdjacentHTML("beforeend", barHtml);
  });
}
