# Endodontics Mastery (EndoQuiz) 🦷

A premium, highly interactive Progressive Web App (PWA) designed to help Endodontists prepare for Middle Eastern Prometric Specialist Exams (DHA, HAAD/DoH, QCHP, SCFHS). 

The app features a modern, glassmorphism UI, an advanced **Spaced Repetition System (SRS)**, and a self-healing AI pipeline that guarantees a high-fidelity, evolving question bank.

## ✨ Key Features

- **Spaced Repetition System (SRS)**: Integrated **SM-2 algorithm** that tracks your mastery. Correct answers push reviews further out, while mistakes trigger a review tomorrow, ensuring optimal long-term retention.
- **Advanced Performance Analytics**: Deep diagnostic tracking including a **2x2 Cognitive Tier Grid** (Recall to Expert Synthesis) and **Per-Domain Accuracy Charts** with a 65% mastery threshold.
- **Clinical Image Support**: High-fidelity radiographic, CBCT, and clinical photo support with **tap-to-zoom** functionality for detailed diagnostic inspection.
- **Unanswered Question Guard**: Prevents accidental skips and data inflation. Includes a shake-animation and tooltip guard to ensure every session counts toward your score.
- **Mastery Guide**: An on-device interactive manual explaining core app mechanics and specialist exam-prep strategies.
- **Offline Background Sync**: PWA v20 utilizes a **Network-First** strategy for core assets (`app.js`, `styles.css`, `questions.json`), guaranteeing you always see the latest UI fixes when online while maintaining robust offline access.
- **Split-Card Feedback**: Contextual reasoning injected directly beneath your selected option, providing immediate, scroll-free learning.
- **Dynamic Difficulty Tiers**: Questions scaled from Tier 1 (Recall) to Tier 4 (Expert Synthesis), mirroring Prometric specialist board complexity.

## 🤖 Automated AI Pipeline

The project features a robust, self-maintaining intelligence layer powered by **GitHub Actions** and **Google Gemini 3 Flash**.

- **Self-Healing Generation**: The script audits every batch's difficulty distribution. If the AI drifts from the target balance (3/10/9/3), the system automatically adjusts the next batch's prompt to "heal" the bank's equilibrium.
- **Fuzzy Deduplication**: Advanced **SequenceMatcher** analysis prevents near-duplicate questions (e.g., swapping a tooth number) from entering the database.
- **Post-Generation Validation**: Every question undergoes a strict schema and quality check. Hallucinations or forbidden distractors (like "All of the above") are automatically rejected.
- **Daily Updates**: Generates **50 new specialist-level cases** every 24 hours, anchored to current IADT and AAE guidelines.

## 🚀 Setup & Local Development

This is a vanilla front-end application with no complex build dependencies.

1. **Clone the repository**
2. **Start a local server:**
   Double-click the included `serve.bat` file, or run:
   ```bash
   python -m http.server 8000
   ```
3. **Open your browser:** Navigate to `http://localhost:8000`.

## 🌐 Deployment & Automation Setup

1. Host the project using **GitHub Pages**.
2. Obtain an API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. In your GitHub Repository, go to **Settings > Secrets and variables > Actions**.
4. Add a repository secret named `GEMINI_API_KEY`.
5. Ensure **Workflow Permissions** are set to "Read and write permissions" in Settings > Actions > General to allow the AI to commit new questions to your repository.

---
*Developed for Endodontic Specialist Board Preparation.*
