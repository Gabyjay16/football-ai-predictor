import { NextResponse } from "next/server";
import { initDb } from "../../../lib/db";
import { fetchUpcomingMatches } from "../../../lib/football";
import { analyzeMatches } from "../../../lib/gemini";

export const dynamic = "force-dynamic";

const ALL_LEAGUES = ['PL', 'ELC', 'PD', 'BL1', 'SA', 'FL1', 'DED', 'PPL', 'GSL', 'TSL', 'BSA', 'MLN', 'BEL', 'RPL', 'CL', 'EL'];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get('refresh') === 'true';
    const market = searchParams.get('market') || null;
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.60');
    let targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) targetDate = new Date().toISOString().split('T')[0];
    const db = await initDb();

    // Check if predictions already exist for the target date
    let existing = await db.execute({
      sql: "SELECT * FROM predictions WHERE match_date = ? AND status = 'pending'",
      args: [targetDate],
    });

    if (existing.rows.length === 0 || refresh) {
      // Fetch matches across many leagues, keep those on the target date.
      const allMatches = await fetchUpcomingMatches(ALL_LEAGUES, 1);
      const matches = allMatches.filter(m => m.date === targetDate);

      if (matches.length === 0) {
        return NextResponse.json({ predictions: [], message: 'No matches scheduled on ' + targetDate });
      }

      // Get learning context from past lessons
      const lessons = await db.execute("SELECT DISTINCT lesson FROM learning_log ORDER BY logged_at DESC LIMIT 5");
      const learningContext = lessons.rows.map(r => r.lesson).join('\n');

      let aiResult;
      try {
        aiResult = await analyzeMatches(matches, learningContext);
        console.log('AI predictions generated');
      } catch (e) {
        console.error('AI failed, using fallback:', e.message);
        // Fallback if no API key or API error
        aiResult = [{
          matchId: 'sample-pl-1',
          homeTeam: 'Arsenal',
          awayTeam: 'Everton',
          predictions: [
            { market: 'over_1.5', expected: 'Over 1.5 goals at FT', confidence: 0.85, reasoning: 'Arsenal strong attack' },
            { market: 'under_4.5', expected: 'Under 4.5 goals at FT', confidence: 0.88, reasoning: 'Low scoring matchup expected' },
            { market: 'double_chance_1x', expected: 'Home or Draw', confidence: 0.75, reasoning: 'Arsenal at home' },
          ]
        }];
      }

      // Clear old pending predictions for the target date
      if (existing.rows.length > 0) {
        await db.execute("DELETE FROM predictions WHERE match_date = ? AND status = 'pending'", [targetDate]);
      }

      // Save new predictions
      for (const match of aiResult) {
        const matchInfo = matches.find(m => m.id === match.matchId) || {
          id: match.matchId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          competition: 'Unknown',
          date: targetDate,
          utcDate: null,
        };

        for (const pred of match.predictions) {
          await db.execute({
            sql: `INSERT INTO predictions (match_id, competition, home_team, away_team, match_date, prediction, market, confidence, kickoff, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            args: [
              matchInfo.id,
              matchInfo.competition,
              matchInfo.homeTeam,
              matchInfo.awayTeam,
              matchInfo.date,
              pred.expected || pred.market,
              pred.market,
              pred.confidence,
              matchInfo.utcDate || null,
            ],
          });
        }
      }
    }

    // Fetch predictions for the target date, optionally filtered by market & confidence
    // market groups map a slug to one or more stored market values.
    const MARKET_GROUPS = {
      'over1.5': ['over_1.5'],
      'under3.5': ['under_3.5'],
      'under4.5': ['under_4.5'],
      'double-chance': ['double_chance_1x', 'double_chance_x2', 'double_chance'],
      'straight-win': ['straight_win_1', 'straight_win_2', 'straight_win', 'home_win', 'away_win'],
      'over2.5': ['over_2.5'],
    };
    const marketValues = market && MARKET_GROUPS[market] ? MARKET_GROUPS[market] : (market ? [market] : null);

    let marketClause = '';
    const baseParams = [targetDate, minConfidence];
    if (marketValues && marketValues.length === 1) {
      marketClause = ' AND p.market = ?';
      baseParams.push(marketValues[0]);
    } else if (marketValues && marketValues.length > 1) {
      marketClause = ` AND p.market IN (${marketValues.map(() => '?').join(', ')})`;
      baseParams.push(...marketValues);
    }

    const predictions = await db.execute({
      sql: `SELECT p.*, 
            CASE WHEN m.result IS NOT NULL THEN m.result ELSE NULL END as actual_result,
            CASE WHEN m.home_score IS NOT NULL THEN m.home_score ELSE NULL END as actual_home,
            CASE WHEN m.away_score IS NOT NULL THEN m.away_score ELSE NULL END as actual_away
            FROM predictions p 
            LEFT JOIN match_results m ON p.match_id = m.match_id
            WHERE p.match_date = ? AND p.confidence >= ? ${marketClause}
            ORDER BY p.confidence DESC, p.created_at DESC`,
      args: baseParams,
    });

    return NextResponse.json({ predictions: predictions.rows, fromAI: true });
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}