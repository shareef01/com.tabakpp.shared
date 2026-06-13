# 🚬 TABAK++ | Master PWA Documentation
**Version: 28.5.0-MASTER-PRODUCTION**

TABAK++ is a high-fidelity, production-grade Progressive Web App (PWA) designed for quit-control tracking. It features a professional **Obsidian Dark** aesthetic, real-time synchronization, and a custom cinematic animation engine.

---

## 🏛️ Architectural Overview (MVVM)
The application is built on a clean **Model-View-ViewModel** architecture to ensure data integrity and zero-flicker UI updates.

### 1. Model (`RegistryService`)
Located in `services/registryService.js`. This is the single source of truth for all Firestore interactions.
- **Atomic Updates**: Uses Firestore `increment` and `arrayUnion` for race-condition-free logging.
- **Snapshot Listeners**: Utilizes `onSnapshot` for real-time, cross-tab synchronization.

### 2. ViewModel (`useRegistry` Hook)
Located in `hooks/useRegistry.js`. This layer processes raw data into UI-ready metrics.
- **Calculation Engine**: Computes Streaks, XP, and Savings on the fly.
- **State Management**: Exposes clean methods like `increment(id)` and `reorder()` to the View layer.

### 3. View (React Components)
Located in `App.jsx` and `components/`.
- **Framer Motion**: Powering all transitions and the "Burning Cigarette" hero animation.
- **Tailwind CSS**: Enforcing the "Obsidian" design system with neon-lime (#D4FF32) accents.

---

## ✨ Key Features & UX Design

### 🎬 Cinematic Auth Portal
The gateway to the application, designed for maximum professional impact.
- **Fixed Top-Left Branding**: The `TABAK++` logo is anchored to the header with strict `whitespace-nowrap` enforcement.
- **BurningCigarette Hero**: A 3D-textured animation with a pulsing red ember and multi-layered smoke trails.
- **Segmented Toggle**: A custom absolute-sliding switch for Sign In / Sign Up with zero-clipping math.

### 📊 Global Widget Scaling
The dashboard supports three distinct layout densities, controllable via the header icons:
- **Small (Grid2X2)**: Compact rows for high-volume trackers.
- **Medium (Columns2)**: Balanced verticality (420px min-height).
- **Large (Square)**: Full-size, high-fidelity gauges (520px min-height).

### 📈 High-Density Insights
The History screen uses ultra-compact **InsightCards** to display capital saved, health recovered, and current streaks. 
- **Legibility Hardened**: Secondary labels use a calibrated 70-80% opacity standard to ensure readability in all lighting conditions.

---

## 💻 Code Deep-Dive

### Real-Time Sync Logic
```javascript
// Located in hooks/useRegistry.js
useEffect(() => {
  if (!user) return;
  // Listen to configuration changes
  const unsubConfig = onSnapshot(doc(db, 'users', user.uid), (s) => {
    // Immediate UI update across all logged-in devices
  });
  return () => unsubConfig();
}, [user]);
```

### High-Fidelity Gauge Logic
The `SmokingProgress` component uses a complex layered CSS/Framer stack:
- **Layer 1**: Obsidian backdrop with `border-white/10`.
- **Layer 2**: Tobacco Body (Gradient from zinc-800 to white).
- **Layer 3**: The Burning Tip (Pulsing orange-red ember).
- **Layer 4**: Atmospheric orange glow (`blur-[120px]`).

---

## 📲 PWA Installation

### iOS Safari
1. Open `https://tabakpp.web.app`
2. Tap the **Share** button.
3. Scroll down and select **"Add to Home Screen"**.
4. The app will launch with a clean standalone window (no browser bars).

### Android Chrome
1. Open the URL.
2. Tap the three dots (menu).
3. Select **"Install App"**.

---

## 🚀 Deployment & Maintenance

To deploy the latest master build to production:
```bash
# 1. Build the production bundle
npm run build

# 2. Deploy to Firebase Hosting
firebase deploy --only hosting:tabakpp
```

---
**TABAK++ is engineered for resilience, legibility, and speed.**
*Copyright © 2024 TABAK++ Systems.*
