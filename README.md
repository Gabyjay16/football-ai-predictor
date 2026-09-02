# Football AI Predictor

AI-powered football betting predictions with self-learning capabilities. Uses Gemini 3.7 Flash (via OpenRouter) to analyze matches, generate predictions, and learn from past mistakes.

## Live App

**https://football-ai-umber.vercel.app**

## Features

- **AI Analysis**: Gemini 3.7 Flash analyzes fixtures using team form, H2H, and patterns
- **Predictions**: Over 1.5, Under 3.5, Under 4.5, Double Chance, Straight Win
- **Result Tracking**: Record final scores to mark predictions Won/Lost
- **7-Day History**: View all predictions and outcomes from the last week
- **Self-Learning**: AI generates lessons from losing predictions and uses them in future analysis
- **Win Rate Stats**: Track prediction accuracy over time

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Today's predictions & AI analysis |
| Track Results | `/track` | Enter final scores to update predictions |
| History | `/history` | Last 7 days of predictions with Won/Lost |
| AI Learning | `/learn` | Lessons the AI learned from past mistakes |

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Turso/libSQL** (cloud SQLite for persistence)
- **OpenRouter API / Gemini 3.7 Flash**
- **Tailwind CSS**
- **Vercel** (deployment)

## Environment Variables

```
OPENROUTER_API_KEY=your-openrouter-key
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

## Development

```bash
npm install
npm run dev
```

## How Self-Learning Works

1. AI predicts outcomes for today's matches with confidence scores
2. After matches finish, record scores in the Track page
3. Each prediction is automatically marked **Won** or **Lost**
4. AI generates a lesson for every losing prediction (e.g. "underestimated mid-table team away performance")
5. These lessons are injected into the next day's analysis prompt
6. The model improves progressively as it accumulates match data

## Disclaimer

This tool provides statistical/AI analysis only. No prediction system guarantees wins. Always bet responsibly and within your means.