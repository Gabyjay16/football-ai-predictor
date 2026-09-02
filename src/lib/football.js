import { getDb } from './db';

export async function fetchUpcomingMatches(league = 'PL', days = 1) {
  // Without football-data API key, we use sample fixture data
  // so the app is functional out of the box
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  // Sample realistic fixtures for the next few days
  const fixtures = [
    {
      id: 'sample-pl-1',
      competition: 'Premier League',
      homeTeam: 'Arsenal',
      awayTeam: 'Everton',
      date: fmt(today),
      status: 'SCHEDULED',
    },
    {
      id: 'sample-pl-2',
      competition: 'Premier League',
      homeTeam: 'Chelsea',
      awayTeam: 'Fulham',
      date: fmt(today),
      status: 'SCHEDULED',
    },
    {
      id: 'sample-la-1',
      competition: 'La Liga',
      homeTeam: 'Real Madrid',
      awayTeam: 'Getafe',
      date: fmt(today),
      status: 'SCHEDULED',
    },
    {
      id: 'sample-se-1',
      competition: 'Serie A',
      homeTeam: 'Inter Milan',
      awayTeam: 'Lecce',
      date: fmt(today),
      status: 'SCHEDULED',
    },
    {
      id: 'sample-bu-1',
      competition: 'Bundesliga',
      homeTeam: 'Bayern Munich',
      awayTeam: 'Stuttgart',
      date: fmt(today),
      status: 'SCHEDULED',
    },
  ];

  return fixtures.filter(f => f.date >= fmt(new Date()) && f.date <= fmt(new Date(Date.now() + days * 86400000)));
}

export async function fetchPastMatches(days = 7) {
  // Sample finished matches for history view
  const results = [
    { id: 'hist-1', homeTeam: 'Liverpool', awayTeam: 'Crystal Palace', homeScore: 2, awayScore: 1, result: 'H', date: daysAgoStr(6) },
    { id: 'hist-2', homeTeam: 'Manchester City', awayTeam: 'Brentford', homeScore: 3, awayScore: 0, result: 'H', date: daysAgoStr(6) },
    { id: 'hist-3', homeTeam: 'Tottenham', awayTeam: 'Wolves', homeScore: 1, awayScore: 1, result: 'D', date: daysAgoStr(5) },
    { id: 'hist-4', homeTeam: 'Newcastle', awayTeam: 'Southampton', homeScore: 2, awayScore: 0, result: 'H', date: daysAgoStr(5) },
    { id: 'hist-5', homeTeam: 'Man United', awayTeam: 'West Ham', homeScore: 1, awayScore: 2, result: 'A', date: daysAgoStr(4) },
    { id: 'hist-6', homeTeam: 'Brighton', awayTeam: 'Aston Villa', homeScore: 2, awayScore: 2, result: 'D', date: daysAgoStr(3) },
    { id: 'hist-7', homeTeam: 'Arsenal', awayTeam: 'Leicester', homeScore: 4, awayScore: 1, result: 'H', date: daysAgoStr(2) },
    { id: 'hist-8', homeTeam: 'Chelsea', awayTeam: 'Nottingham Forest', homeScore: 2, awayScore: 0, result: 'H', date: daysAgoStr(1) },
  ];
  return results;
}

function daysAgoStr(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().split('T')[0];
}