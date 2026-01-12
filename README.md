# Huutopussi Score Tracker

A mobile-friendly Progressive Web App (PWA) for tracking scores in Huutopussi card game matches.

## Features

🃏 **Game Features:**

- Add 2-6 players per game
- Track scores round by round
- Automatic total calculation
- Game ends when someone reaches 100 points
- Declare winner with lowest score
- Delete last round if needed
- Reset game to start over

📱 **Mobile & PWA Features:**

- Mobile-optimized compact design
- Progressive Web App capabilities
- Downloadable app for offline use
- Responsive design for all screen sizes
- Local storage saves game progress

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone or download the project
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## How to Use

1. **Setup Players**: Enter player names (2-6 players)
2. **Start Game**: Click "Start Game" to begin
3. **Add Scores**: Enter scores for each round and click "Add Round"
4. **Track Progress**: View running totals and game history
5. **Game Over**: Game automatically ends when someone reaches 100 points
6. **New Game**: Click "New Game" to reset and start over

## About Huutopussi

Huutopussi is a popular Finnish card game where players try to avoid penalty points. The goal is to have the lowest score when someone reaches 100 points.

## PWA Installation

On mobile devices, you can install this app:

1. Open the website in your browser
2. Look for "Add to Home Screen" option
3. The app will be available offline after installation

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **PWA** - Progressive Web App features
- **Local Storage** - Data persistence

## License

This project is for personal use and game enjoyment.
