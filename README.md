# Logistics Truck Route Visualizer

A sophisticated, React-based frontend application that simulates a truck moving through delivery locations. This project was built to demonstrate complex state management, map integration, and polished UI/UX design.

## 📸 Previews

### Light Mode Dashboard
*(Add your light mode screenshot here by saving it as `screenshots/light-mode.png`)*
![Light Mode](screenshots/light-mode.png)

### Dark Mode Dashboard
*(Add your dark mode screenshot here by saving it as `screenshots/dark-mode.png`)*
![Dark Mode](screenshots/dark-mode.png)

## ✨ Features

- **Map Integration:** Displays an interactive map (OpenStreetMap) showing the Origin and 3 delivery points.
- **Real-Time Simulation:** Animates a truck marker moving along the route using precise mathematical interpolation (`requestAnimationFrame`) instead of basic CSS transitions, ensuring smooth performance.
- **Dynamic Status Dashboard:** 
  - Calculates highly accurate distances on-the-fly using the Haversine formula.
  - Live progress bars indicating overall route completion.
- **Stop Sequence Timeline:** A custom horizontal stepper tracking past, current, and future delivery checkpoints.
- **Bonus 1: Pause/Resume Tracking:** Ability to halt the simulation completely and resume precisely where it left off.
- **Bonus 2: ETA Calculation:** Calculates remaining estimated time of arrival based on remaining distance and current speed.
- **Bonus 3: Dark Mode:** A sleek dark theme with a custom CSS inversion filter on the map tiles to create a gorgeous dark-matter aesthetic.
- **Bonus 4: Variable Speed Controls:** Ability to adjust the simulation speed (0.5x, 1x, 2x, 4x) for quick testing.

## 🛠️ Technology Stack

- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Mapping:** Leaflet & React-Leaflet

## 🚀 How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone <your-github-url>
   cd logistics-visualizer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **View the app:**
   Open your browser and navigate to the local URL provided in your terminal (usually `http://localhost:5173`).
