import { NextResponse } from "next/server";
import { initDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const TARGET_ODDS = 2.0;

// Convert probability (0-1) to fair decimal odds
function probToOdds(p) {
  return p > 0 ? (1 / p) : Infinity;
}

// Evaluate whether a prediction's market won given a final score
function marketWon(market, home, away) {
  const total = home + away;
  switch (market) {
    case 'over_1.5': return total >= 2;
    case 'over_2.5': return total >= 3;
    case 'under_3.5': return total <= 3;
    case 'under_4.5': return total <= 4;
    case 'double_chance_1x': return home >= away;
    case 'double_chance_x2': return away >= home;
    case 'straight_win_1':
    case 'straight_win':
    case 'home_win': return home > away;
    case 'straight_win_2':
    case 'away_win': return away > home;
    default: {
      // Fallback by matching expected text
      const text = (market || '').toLowerCase();
      if (text.includes('over 1.5') || text.includes('over_1.5')) return total >= 2;
      if (text.includes('under 4.5') || text.includes('under_4.5')) return total <= 4;
      if (text.includes('under 3.5') || text.includes('under_3.5')) return total <= 3;
      if (text.includes('home or draw') || text.includes('1x')) return home >= away;
      if (text.includes('away or draw') || text.includes('x2')) return away >= home;
      return false;
    }
  }
}

export async function GET(req) {
  try {
    const db = await initDb();
    const today = new Date().toISOString().split('T')[0];

    let todayRollover = null;

    // Compute today's candidate picks (only matches scheduled for the current day)
    const preds = await db.execute({
      sql: `SELECT * FROM predictions
            WHERE status = 'pending' AND match_date = ?
            ORDER BY confidence DESC
            LIMIT 40`,
      args: [today],
    });

    // Keep only one (highest-confidence) pick per distinct match
    const byMatch = new Map();
    for (const p of preds.rows) {
      const key = p.match_id;
      if (!byMatch.has(key)) byMatch.set(key, p);
    }
    const candidates = [...byMatch.values()].filter(p => p.confidence >= 0.80);

    // Greedily add safest picks until we reach ~2.0 combined odds or hit the cap.
    const MAX_PICKS = 8;
    const selected = [];
    let combinedOdds = 1;
    for (const p of candidates) {
      const odds = probToOdds(p.confidence);
      if (selected.length === 0) {
        selected.push(p);
        combinedOdds *= odds;
        continue;
      }
      if (combinedOdds * odds > TARGET_ODDS * 1.25) break;
      if (selected.length >= MAX_PICKS) break;
      selected.push(p);
      combinedOdds *= odds;
    }

    // Remove any stale rollover row for today (e.g. built from non-today matches)
    if (selected.length < 2) {
      await db.execute({ sql: "DELETE FROM rollovers WHERE roll_date = ?", args: [today] });
    } else {
      const combinedProb = selected.reduce((acc, p) => acc * p.confidence, 1);
      const serialize = (p) => ({
        predictionId: p.id,
        matchId: p.match_id,
        homeTeam: p.home_team,
        awayTeam: p.away_team,
        market: p.market,
        expected: p.prediction,
        confidence: p.confidence,
        kickoff: p.kickoff || null,
      });
      const serialized = JSON.stringify(selected.map(serialize));

      await db.execute({
        sql: `INSERT INTO rollovers (roll_date, selections, combined_odds, combined_probability, status)
              VALUES (?, ?, ?, ?, 'pending')
              ON CONFLICT(roll_date) DO UPDATE SET
                selections = excluded.selections,
                combined_odds = excluded.combined_odds,
                combined_probability = excluded.combined_probability,
                status = 'pending'`,
        args: [today, serialized, combinedOdds, combinedProb],
      });

      todayRollover = {
        roll_date: today,
        combined_odds: combinedOdds,
        combined_probability: combinedProb,
        status: 'pending',
        selections: selected.map(serialize),
      };
    }

    // Build history: evaluate past rollovers against match_results
    const past = await db.execute("SELECT * FROM rollovers WHERE roll_date != ? ORDER BY roll_date DESC LIMIT 30", [today]);
    const history = [];

    for (const r of past.rows) {
      const selections = typeof r.selections === 'string' ? JSON.parse(r.selections) : (r.selections || []);
      let allSettled = true;
      let allWon = true;

      // Fetch actual results for each match in this rollover
      let fullEvaluation = [];
      for (const s of selections) {
        if (!s.matchId || s.matchId.startsWith('sample') || s.matchId.startsWith('hist')) {
          fullEvaluation.push({ ...s, won: null });
          allSettled = false;
          continue;
        }
        const res = await db.execute({
          sql: "SELECT home_score, away_score FROM match_results WHERE match_id = ?",
          args: [s.matchId],
        });
        if (res.rows.length === 0) {
          fullEvaluation.push({ ...s, won: null });
          allSettled = false;
        } else {
          const hs = res.rows[0].home_score;
          const as = res.rows[0].away_score;
          const won = marketWon(s.market, hs, as) ? 1 : 0;
          if (won === 0) allWon = false;
          fullEvaluation.push({ ...s, won });
        }
      }

      const combinedOdds = r.combined_odds;
      history.push({
        roll_date: r.roll_date,
        combined_odds: combinedOdds,
        selections: fullEvaluation,
        allSettled,
        allWon,
        status: allSettled ? (allWon ? 'won' : 'lost') : 'pending',
      });
    }

    // Also check today's pending selection statuses
    let todaySettled = true;
    let todayWon = true;
    if (todayRollover && todayRollover.selections) {
      for (const s of todayRollover.selections) {
        if (!s.matchId || s.matchId.startsWith('sample') || s.matchId.startsWith('hist')) {
          todaySettled = false;
          continue;
        }
        const res = await db.execute({
          sql: "SELECT home_score, away_score FROM match_results WHERE match_id = ?",
          args: [s.matchId],
        });
        if (res.rows.length === 0) {
          todaySettled = false;
        } else {
          const won = marketWon(s.market, res.rows[0].home_score, res.rows[0].away_score) ? 1 : 0;
          if (!won) todayWon = false;
        }
      }
    }

    return NextResponse.json({
      today: todayRollover,
      todaySettled,
      todayWon,
      history,
    });
  } catch (error) {
    console.error('Rollover API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}