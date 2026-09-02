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

    // Check if today's rollover already exists
    let existing = await db.execute({
      sql: "SELECT * FROM rollovers WHERE roll_date = ?",
      args: [today],
    });

    let todayRollover = null;

    if (existing.rows.length === 0) {
      // Build today's accumulator from pending, still-unsettled predictions
      const preds = await db.execute(`
        SELECT * FROM predictions
        WHERE status = 'pending'
        ORDER BY confidence DESC
        LIMIT 10
      `);

      const picks = preds.rows.filter(p => p.confidence >= 0.75);

      if (picks.length > 0) {
        // Greedily select safest picks until combined odds >= ~2.0
        const selected = [];
        let combinedOdds = 1;
        for (const p of picks) {
          const odds = probToOdds(p.confidence);
          if (combinedOdds * odds >= TARGET_ODDS || selected.length === 0) {
            // Only stop adding once we reach target with at least 2 picks
            if (combinedOdds * odds >= TARGET_ODDS && selected.length >= 1) {
              if (selected.length + 1 >= 2) {
                selected.push(p);
                combinedOdds *= odds;
                break;
              }
            }
            if (selected.length < 2 || combinedOdds * odds < TARGET_ODDS * 1.5) {
              selected.push(p);
              combinedOdds *= odds;
            }
            if (combinedOdds >= TARGET_ODDS && selected.length >= 2) break;
          }
        }

        if (selected.length >= 2) {
          const combinedProb = selected.reduce((acc, p) => acc * p.confidence, 1);
          const serialized = JSON.stringify(selected.map(p => ({
            predictionId: p.id,
            matchId: p.match_id,
            homeTeam: p.home_team,
            awayTeam: p.away_team,
            market: p.market,
            expected: p.prediction,
            confidence: p.confidence,
          })));

          await db.execute({
            sql: `INSERT INTO rollovers (roll_date, selections, combined_odds, combined_probability, status)
                  VALUES (?, ?, ?, ?, 'pending')`,
            args: [today, serialized, combinedOdds, combinedProb],
          });

          todayRollover = {
            roll_date: today,
            combined_odds: combinedOdds,
            combined_probability: combinedProb,
            status: 'pending',
            selections: selected.map(p => ({
              predictionId: p.id,
              matchId: p.match_id,
              homeTeam: p.home_team,
              awayTeam: p.away_team,
              market: p.market,
              expected: p.prediction,
              confidence: p.confidence,
            })),
          };
        }
      }
    } else {
      // Parse existing selections
      const row = existing.rows[0];
      todayRollover = {
        roll_date: row.roll_date,
        combined_odds: row.combined_odds,
        combined_probability: row.combined_probability,
        status: row.status,
        selections: typeof row.selections === 'string' ? JSON.parse(row.selections) : (row.selections || []),
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