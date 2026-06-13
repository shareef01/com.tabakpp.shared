# 🚬 TABAK++ | Master Production PWA
**Version: 28.5.0-STABLE**

TABAK++ is a high-fidelity Progressive Web App engineered for quit-control tracking. It features an **Obsidian Dark** aesthetic with neon accents and cinematic animations.

---

## 🛠️ Technology Stack
The application is built using a modern, high-performance stack for zero-flicker UI and real-time data persistence.

- **Frontend Core**: [React.js](https://reactjs.org/) (Functional Components + Hooks)
- **State Management**: [Model-View-ViewModel (MVVM)](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel) pattern for synchronized UI states.
- **Backend/Database**: [Firebase Firestore](https://firebase.google.com/products/firestore) (Real-time `onSnapshot` listeners).
- **Authentication**: [Firebase Auth](https://firebase.google.com/products/auth) (Secure email/password session management).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Obsidian design system with neon-lime #D4FF32 accents).
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Cinematic "Burning Cigarette" hero and spring-physics transitions).
- **Icons**: [Lucide React](https://lucide.dev/) (High-density stroke icons).
- **Charts**: [Recharts](https://recharts.org/) (High-fidelity historical data visualization).

---

## 🌐 Online Production Testing
The application is live and can be tested on any modern browser or installed as a native app.

**Live URL**: [https://tabakpp.web.app](https://tabakpp.web.app)

### 📲 PWA Installation (Native Experience)
For the best experience, install TABAK++ as a standalone application on your device:

#### **iOS Safari**
1. Open the URL in Safari.
2. Tap the **Share** icon (square with arrow).
3. Scroll down and select **"Add to Home Screen"**.
4. Launch from your home screen for a fullscreen, standalone experience.

#### **Android Chrome**
1. Open the URL in Chrome.
2. Tap the **three dots** (menu).
3. Select **"Install App"**.

---

## 🔐 Security & Deployment
- **Environment Management**: Secrets (Firebase API keys) are externalized via `.env` using Vite's `import.meta.env` system to ensure security on GitHub.
- **Hosting**: Deployed via [Firebase Hosting](https://firebase.google.com/products/hosting).

**To deploy updates**:
```bash
# Build the production bundle
npm run build

# Push to Firebase
firebase deploy --only hosting:tabakpp
```

---
**TABAK++ is engineered for resilience, legibility, and speed.**
*Copyright © 2024 TABAK++ Systems.*
