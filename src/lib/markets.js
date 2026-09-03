// Bet market definitions used across the dashboard and market pages
export const MARKETS = [
  {
    slug: 'over1.5',
    name: 'Over 1.5 Goals',
    short: 'Over 1.5',
    description: 'Both teams score at least 2 goals in total',
    market: 'over_1.5',
    emoji: '⚽',
    gradient: 'from-blue-900/40 to-slate-900',
    border: 'border-blue-600/30',
  },
  {
    slug: 'under3.5',
    name: 'Under 3.5 Goals',
    short: 'Under 3.5',
    description: 'Less than 4 goals scored in total',
    market: 'under_3.5',
    emoji: '🧱',
    gradient: 'from-purple-900/40 to-slate-900',
    border: 'border-purple-600/30',
  },
  {
    slug: 'under4.5',
    name: 'Under 4.5 Goals',
    short: 'Under 4.5',
    description: 'Less than 5 goals scored in total',
    market: 'under_4.5',
    emoji: '🛡️',
    gradient: 'from-green-900/40 to-slate-900',
    border: 'border-green-600/30',
  },
  {
    slug: 'double-chance',
    name: 'Double Chance',
    short: 'Double Chance',
    description: 'Cover two outcomes (1X / X2)',
    market: 'double_chance',
    emoji: '🎫',
    gradient: 'from-amber-900/40 to-slate-900',
    border: 'border-amber-600/30',
  },
  {
    slug: 'straight-win',
    name: 'Straight Win',
    short: 'Straight Win',
    description: 'Pick the side that wins outright',
    market: 'straight_win',
    emoji: '🏆',
    gradient: 'from-red-900/40 to-slate-900',
    border: 'border-red-600/30',
  },
];

export function getMarket(slug) {
  return MARKETS.find(m => m.slug === slug) || null;
}

export function englishTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Douala',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}