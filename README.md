# 🦘 Mathe Kanguru

A fun, interactive math quiz game for children (ages 7-9) featuring pixel art style, sticker collection, and engaging animations.

## Features

### 🎮 Core Gameplay
- **Multi-language Support**: German (Deutsch) and Chinese (中文)
- **Exam Selection**: Choose class level and year
- **Question Count**: Configurable (5-24 questions)
- **Retry Mode**: Practice wrong answers across all years for a class

### 🎨 Child-Friendly Design
- **Playful Visual Style**: Colorful option cards, rounded corners, bounce animations
- **Celebration Effects**: Confetti and sound on correct answers
- **No Punishment**: Incorrect answers show "ESCAPE" without negative effects
- **Large Touch Targets**: Designed for tablet use

### 📱 Responsive Layout
- **Desktop Optimized**: Max-width container, 3-column fluid layout
- **iPad Friendly**: Compact spacing, responsive text sizes
- **Landscape First**: Horizontal layout prioritized

### ✏️ Interactive Tools
- **Sketching Overlay**: Draw and annotate on screen
- **Image Drag & Drop**: Move images freely with rotation support
- **Long-Press to Drag**: Touch devices require 300ms hold to prevent accidental drags
- **Back Navigation**: Go back to previous questions to change answers

### 💡 Hint System
- Expandable hint cards with tips
- Support for GIF animations and interactive drag-drop hints

### 🏆 Progress & Rewards
- **Points System**: Earn points for correct answers
- **Sticker Store**: Spend points on virtual stickers
- **Gallery**: View and select collected stickers as avatar
- **Cloud Save**: Progress synced via Google Sheets

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (with persistence)
- **Backend**: Google Apps Script
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file:

```ini
VITE_GOOGLE_APP_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_PASS_THRESHOLD=5
VITE_QUESTION_COUNT=10
```

## Deployment

This project is configured to deploy to GitHub Pages using GitHub Actions.

1.  **Enable GitHub Actions**: Go to **Settings > Pages > Build and deployment > Source** and select **GitHub Actions**.
2.  **Configure Secrets**: Go to **Settings > Secrets and variables > Actions > New repository secret**:
    *   `VITE_GOOGLE_APP_SCRIPT_URL`: Your Google Apps Script deployment URL.
    *   `VITE_API_SECRET`: A shared secret password (must match `backend/Code.js`).
3.  **Configure Variables**: Go to **Variables** tab (next to Secrets):
    *   `VITE_QUESTION_COUNT`: (Optional) e.g., `24`.
4.  **Deploy**: Push to the `main` branch to trigger the deployment workflow.

## Project Structure

```
src/
├── components/
│   ├── Game/
│   │   ├── AvatarDisplay.tsx      # Player avatar with feedback animations
│   │   ├── QuestionCard.tsx       # Question and answer options
│   │   ├── HintCard.tsx           # Expandable hint system
│   │   ├── SketchOverlay.tsx      # Drawing tools overlay
│   │   ├── DraggableImage.tsx     # Draggable image component
│   │   ├── ImageOverlayLayer.tsx  # Floating dragged images
│   │   └── CelebrationEffect.tsx  # Correct answer celebration
│   └── Store/
│       └── StickerStore.tsx       # Gacha sticker shop
├── context/
│   └── ImageDragContext.tsx       # Global image drag state
├── pages/
│   ├── Login.tsx                  # Start screen
│   ├── GameBoard.tsx              # Main game screen
│   ├── Results.tsx                # Score summary
│   └── Gallery.tsx                # Sticker collection
├── stores/
│   └── useGameStore.ts            # Zustand stores
└── services/
    └── api.ts                     # Google Apps Script API
```

## Documentation

See [SPEC.md](./SPEC.md) for detailed game specification and design decisions.

## License

Private project - All rights reserved.
