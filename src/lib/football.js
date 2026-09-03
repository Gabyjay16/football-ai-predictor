// football-data.org (real current-season fixtures & scores)
// Free tier: 10 requests/min. Requires FOOTBALL_API_KEY.
const FD_BASE = 'https://api.football-data.org/v4';

// football-data.org competition codes
const LEAGUE_CODES = {
  PL: 'PL', // English Premier League
  ELC: 'ELC', // Championship (England)
  PD: 'PD', // La Liga (Spain)
  BL1: 'BL1', // Bundesliga (Germany)
  SA: 'SA', // Serie A (Italy)
  FL1: 'FL1', // Ligue 1 (France)
  DED: 'DED', // Eredivisie (Netherlands)
  PPL: 'PPL', // Primeira Liga (Portugal)
  GSL: 'GSL', // Scottish Premiership
  TSL: 'TSL', // Turkish Süper Lig
  BSA: 'BSA', // Brazilian Serie A
  MLN: 'MLN', // Major League Soccer
  BEL: 'BEL', // Belgian Pro League
  RPL: 'RPL', // Russian Premier Liga
  CL: 'CL', // Champions League
  EL: 'EL', // Europa League
};

const LEAGUE_NAMES = {
  PL: 'Premier League',
  ELC: 'Championship',
  PD: 'La Liga',
  BL1: 'Bundesliga',
  SA: 'Serie A',
  FL1: 'Ligue 1',
  DED: 'Eredivisie',
  PPL: 'Primeira Liga',
  GSL: 'Scottish Premiership',
  TSL: 'Turkish Süper Lig',
  BSA: 'Brazilian Serie A',
  MLN: 'MLS',
  BEL: 'Belgian Pro League',
  RPL: 'Russian Premier Liga',
  CL: 'Champions League',
  EL: 'Europa League',
};

/**
 * Fetch upcoming fixtures. `league` is a single competition code or an array of codes.
 * @param {string|string[]} league
 * @param {number} [days]
 */
export async function fetchUpcomingMatches(league = 'PL', days = 1) {
  const apiKey = process.env.FOOTBALL_API_KEY;

  // Real data if a football-data.org key is configured.
  // Widen the window so upcoming real fixtures are found even if today has none.
  if (apiKey) {
    try {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 4); // look ahead up to 4 days
      const dateFrom = now.toISOString().split('T')[0];
      const dateTo = end.toISOString().split('T')[0];

      // league may be a single code or an array of codes
      const codes = Array.isArray(league) ? league : [league];

      // Fetch matches across many leagues to cover every bet market.
      // Keep to ~8 leagues per call to respect the free-tier limit (10 req/min).
      const allMatches = [];
      const limitedCodes = codes.slice(0, 8);

      for (const code of limitedCodes) {
        const url = `${FD_BASE}/competitions/${code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
        const res = await fetch(url, {
          headers: { 'X-Auth-Token': apiKey },
          cache: 'no-store',
        });

        if (!res.ok) {
          console.warn('football-data.org', code, 'returned', res.status);
          continue;
        }

        const data = await res.json();
        const matches = (data.matches || [])
          .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
          .map(m => {
            const id = String(m.id);
            return {
              id,
              competition: m.competition?.name || LEAGUE_NAMES[code] || code,
              homeTeam: m.homeTeam?.name || `Home ${id}`,
              awayTeam: m.awayTeam?.name || `Away ${id}`,
              date: (m.utcDate || '').split('T')[0] || dateFrom,
              status: m.status,
              utcDate: m.utcDate,
              homeId: m.homeTeam?.id,
              awayId: m.awayTeam?.id,
            };
          });
        allMatches.push(...matches);
      }

      if (allMatches.length > 0) {
        // Dedupe by id, then cap. Return real matches even if fewer than expected.
        const seen = new Set();
        const unique = allMatches.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        }).slice(0, 20);
        return unique;
      }
      // no real matches across the requested leagues, do not fall back to samples
      return [];
    } catch (e) {
      console.error('football-data.org fixtures fetch failed, using sample data:', e.message);
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
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - days);
      const dateFrom = start.toISOString().split('T')[0];

      const url = `${FD_BASE}/matches?dateFrom=${dateFrom}&status=FINISHED`;
      const res = await fetch(url, {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 900 },
      });

      if (res.ok) {
        const data = await res.json();
        const matches = (data.matches || [])
          .filter(m => m.status === 'FINISHED' && m.score?.fullTime?.home != null)
          .map(m => {
            const home = m.score.fullTime.home;
            const away = m.score.fullTime.away;
            return {
              id: String(m.id),
              homeTeam: m.homeTeam?.name,
              awayTeam: m.awayTeam?.name,
              homeScore: home,
              awayScore: away,
              result: home > away ? 'H' : home < away ? 'A' : 'D',
              date: (m.utcDate || '').split('T')[0],
            };
          });
        if (matches.length > 0) return matches;
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