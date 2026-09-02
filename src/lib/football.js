import { getDb } from './db';

// football-data.org API for real fixtures (optional - requires free API key)
// If FOOTBALL_API_KEY is not set, returns sample fixtures so the app is functional.
const FOOTBALL_ORG = 'https://api.football-data.org/v4';

export async function fetchUpcomingMatches(league = 'PL', days = 1) {
  const apiKey = process.env.FOOTBALL_API_KEY;

  // Real data if a football-data.org key is configured
  if (apiKey) {
    try {
      const today = new Date();
      const end = new Date(today);
      end.setDate(end.getDate() + days);
      const dateFrom = today.toISOString().split('T')[0];
      const dateTo = end.toISOString().split('T')[0];

      const url = `${FOOTBALL_ORG}/competitions/${league}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const res = await fetch(url, {
        headers: { 'X-Auth-Token': apiKey },
      });

      if (res.ok) {
        const data = await res.json();
        const matches = (data.matches || [])
          .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
          .map(m => ({
            id: String(m.id),
            competition: m.competition?.name || league,
            homeTeam: m.homeTeam?.name || `Home ${m.id}`,
            awayTeam: m.awayTeam?.name || `Away ${m.id}`,
            date: m.utcDate?.split('T')[0] || dateFrom,
            status: m.status,
            homeId: m.homeTeam?.id,
            awayId: m.awayTeam?.id,
          }));
        return matches;
      }
    } catch (e) {
      console.error('football-data.org fetch failed, using sample data:', e.message);
    }
  }

  // Sample fixtures (fallback when no API key)
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

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

  const cutoff = fmt(new Date(Date.now() + days * 86400000));
  return fixtures.filter(f => f.date <= cutoff);
}

export async function fetchPastMatches(days = 7) {
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (apiKey) {
    try {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - days);
      const dateFrom = start.toISOString().split('T')[0];

      const url = `${FOOTBALL_ORG}/matches?dateFrom=${dateFrom}&status=FINISHED`;
      const res = await fetch(url, {
        headers: { 'X-Auth-Token': apiKey },
      });

      if (res.ok) {
        const data = await res.json();
        return (data.matches || []).map(m => ({
          id: String(m.id),
          homeTeam: m.homeTeam?.name,
          awayTeam: m.awayTeam?.name,
          homeScore: m.score?.fullTime?.home,
          awayScore: m.score?.fullTime?.away,
          result: m.score?.fullTime?.home > m.score?.fullTime?.away ? 'H' :
                  m.score?.fullTime?.home < m.score?.fullTime?.away ? 'A' : 'D',
          date: m.utcDate?.split('T')[0],
        }));
      }
    } catch (e) {
      console.error('football-data.org history fetch failed:', e.message);
    }
  }

  // Sample history (fallback)
  return [
    { id: 'hist-1', homeTeam: 'Liverpool', awayTeam: 'Crystal Palace', homeScore: 2, awayScore: 1, result: 'H', date: daysAgoStr(6) },
    { id: 'hist-2', homeTeam: 'Manchester City', awayTeam: 'Brentford', homeScore: 3, awayScore: 0, result: 'H', date: daysAgoStr(6) },
    { id: 'hist-3', homeTeam: 'Tottenham', awayTeam: 'Wolves', homeScore: 1, awayScore: 1, result: 'D', date: daysAgoStr(5) },
    { id: 'hist-4', homeTeam: 'Newcastle', awayTeam: 'Southampton', homeScore: 2, awayScore: 0, result: 'H', date: daysAgoStr(5) },
    { id: 'hist-5', homeTeam: 'Man United', awayTeam: 'West Ham', homeScore: 1, awayScore: 2, result: 'A', date: daysAgoStr(4) },
    { id: 'hist-6', homeTeam: 'Brighton', awayTeam: 'Aston Villa', homeScore: 2, awayScore: 2, result: 'D', date: daysAgoStr(3) },
    { id: 'hist-7', homeTeam: 'Arsenal', awayTeam: 'Leicester', homeScore: 4, awayScore: 1, result: 'H', date: daysAgoStr(2) },
    { id: 'hist-8', homeTeam: 'Chelsea', awayTeam: 'Nottingham Forest', homeScore: 2, awayScore: 0, result: 'H', date: daysAgoStr(1) },
  ];
}

function daysAgoStr(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().split('T')[0];
}