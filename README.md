# Endodontics Mastery (EndoQuiz) 🦷

A highly interactive, Progressive Web App (PWA) designed to help Endodontists prepare for Middle Eastern Prometric Specialist Exams (DHA, HAAD/DoH, QCHP, SCFHS). 

The app features a modern, glassmorphism UI, comprehensive performance tracking, targeted studying mechanisms, and an AI-powered automation pipeline that guarantees a constantly evolving question bank.

## ✨ Key Features

- **Progressive Web App (PWA)**: Installable directly to mobile and desktop home screens. Fully functional offline with Version 17 caching.
- **Split-Card Interaction**: Redesigned quiz logic that injects reasoning/justification directly beneath each selected option. This eliminates scrolling and provides immediate, context-aware feedback.
- **Dynamic Difficulty Tiers**: Questions are categorized from Tier 1 (Recall) to Tier 4 (Expert Synthesis), mirroring the complexity of specialist-level board exams.
- **Purple Brand Identity**: A cohesive design system with purple-themed toggles and mesh gradients tailored for the Endodontics Mastery brand.
- **Database Dashboard**: A high-level "Knowledge Map" on the home screen that provides a bird's-eye view of the question bank growth and domain distribution.
- **Study Mode & Timer**: Global purple-themed toggle to switch between a timed "Exam Mode" (60s per question) and a relaxed "Study Mode."
- **Clinical Pearls & References**: High-yield learning reinforced with 💎 Clinical Pearls and 📚 Academic References (IADT, AAE, etc.) on separate lines for maximum clarity.
- **Prominent Navigation**: A floating, high-visibility "Exit" button positioned for intuitive flow on both desktop and mobile devices.

## 🤖 Automated AI Pipeline

This project is a self-maintaining learning platform. It utilizes **GitHub Actions** and **Google Gemini 1.5 Flash** (updated to the latest preview model) to automatically expand its knowledge base.

- **Daily Generation**: Every day at midnight UTC, the system generates **50 brand-new**, specialist-level clinical scenarios.
- **Strict Clinical Formatting**: The AI is programmed with rigorous guardrails to ensure distractors are strictly separated (A-D) and clinical reasoning is high-fidelity.
- **Self-Deduplicating**: The AI reviews the existing question bank to ensure no duplicates or near-duplicates are created.
- **Clinical Vignette Quality**: Stems use FDI notation and standard clinical terminology, ensuring high-fidelity exam simulation.

Users can tap the **"Refresh Question Bank"** button in their Profile to seamlessly download the latest daily questions.

## 🚀 Setup & Local Development

This is a purely front-end application built with vanilla HTML5, CSS3, and JavaScript.

1. **Clone the repository**
2. **Start a local server:**
   Double-click the included `serve.bat` file, or run:
   ```bash
   python -m http.server 8000
   ```
3. **Open your browser:** Navigate to `http://localhost:8000`.

## 🌐 Deployment & Automation Setup

1. Host the project securely using **GitHub Pages**.
2. Obtain a free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. In your GitHub Repository, navigate to **Settings > Secrets and variables > Actions**.
4. Add a new repository secret named `GEMINI_API_KEY` and paste your key.
5. The daily automated question generation will now run automatically via GitHub Actions!
