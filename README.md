# Poker Home Game Tracker

A simple, no-login web app for tracking buy-ins and cash-outs during home poker games with automatic balance verification.

## Features

- 🎲 Create games with shareable codes
- 💰 Track variable buy-ins ($20, $30, $40, etc.)
- 📊 Automatic balance verification
- 📱 Mobile-friendly interface
- 💾 Auto-saves to browser storage
- 🔗 Share games via URL
- 🚫 No login required

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start tracking your game.

## How It Works

1. Click "New Game" to generate a unique game code
2. Share the link with other players
3. Add players and track their buy-ins
4. Cash out players and verify the pot balances
5. Export results as CSV for record keeping

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Local Storage for persistence