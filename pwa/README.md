# tabak++ PWA (Web Edition)

This is a 100% feature-parity web version of the `tabak++` Android app, optimized for iPhone and high-performance browsers.

## Key Features
*   **iOS Home Screen Optimization**: Translucent status bar, safe-area support, and custom splash icons.
*   **Obsidian Design Language**: Pure black theme with neon accents and fluid Framer Motion animations.
*   **Logic Parity**: The `smokingCalculator.js` is a direct port of the Kotlin logic.
*   **Offline Support**: Ready for Service Worker integration.

## How to Run
1.  **Environment**: Ensure you have Node.js installed.
2.  **Setup**:
    ```bash
    # Create project (if not already done)
    npm create vite@latest . -- --template react
    npm install tailwindcss postcss autoprefixer framer-motion firebase
    npx tailwindcss init -p
    ```
3.  **Firebase**: Copy your Web Config from the Firebase Console into `src/firebase.js`.
4.  **Launch**:
    ```bash
    npm run dev
    ```

## iPhone PWA Installation
1.  Open the hosted URL in **Safari**.
2.  Tap the **Share** button (box with upward arrow).
3.  Scroll down and tap **Add to Home Screen**.
4.  The app will now appear on your home screen without browser UI, matching the Android look and feel.
