import { NextResponse } from "next/server";
import { initDb } from "../../../lib/db";
import { generateLearningLesson } from "../../../lib/gemini";

export const dynamic = "force-dynamic";

// Record a match result and update predictions status
export async function POST(req) {
  try {
    const body = await req.json();
    const { matchId, homeScore, awayScore, homeTeam, awayTeam } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    const db = await initDb();
    const result = homeScore > awayScore ? 'H' : homeScore < awayScore ? 'A' : 'D';

    // Insert match result
    await db.execute({
      sql: `INSERT OR REPLACE INTO match_results (match_id, home_team, away_team, home_score, away_score, result)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [matchId, homeTeam || '', awayTeam || '', homeScore, awayScore, result],
    });

    // Get predictions for this match
    const matchingPreds = await db.execute({
      sql: "SELECT * FROM predictions WHERE match_id = ?",
      args: [matchId],
    });

    // Determine outcome for each prediction and generate learning
    const totalGoals = homeScore + awayScore;
    const learningLogs = [];

    for (const pred of matchingPreds.rows) {
      let won = false;
      const market = pred.market || '';

      // Evaluate each market
      if (market === 'over_1.5') {
        won = totalGoals >= 2;
      } else if (market === 'under_4.5') {
        won = totalGoals <= 4;
      } else if (market === 'under_3.5') {
        won = totalGoals <= 3;
      } else if (market === 'double_chance_1x') {
        won = homeScore >= awayScore;
      } else if (market === 'double_chance_x2') {
        won = awayScore >= homeScore;
      } else if (market === 'home_win') {
        won = homeScore > awayScore;
      } else if (market === 'away_win') {
        won = awayScore > homeScore;
      } else if (market === 'over_2.5') {
        won = totalGoals >= 3;
      } else {
        // Fallback: guess by matching prediction text
        const text = pred.prediction || '';
        if (text.includes('Over 1.5')) won = totalGoals >= 2;
        else if (text.includes('Under 4.5')) won = totalGoals <= 4;
        else if (text.includes('Under 3.5')) won = totalGoals <= 3;
        else if (text.includes('Home or Draw')) won = homeScore >= awayScore;
        else if (text.includes('Away or Draw')) won = awayScore >= homeScore;
        else won = false;
      }

      // Update prediction status
      await db.execute({
        sql: `UPDATE predictions SET status = ? WHERE id = ?`,
        args: [won ? 'won' : 'lost', pred.id],
      });

      // Generate learning lesson from this outcome
      try {
        const lesson = await generateLearningLesson(pred, {
          home_score: homeScore,
          away_score: awayScore,
          result,
          status: won ? 'won' : 'lost',
        });

        await db.execute({
          sql: `INSERT INTO learning_log (prediction_id, market, expected, actual, won, reason, lesson)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            pred.id,
            market,
            pred.prediction,
            result,
            won ? 1 : 0,
            lesson.reason || 'Match finished',
            lesson.lesson || '',
          ],
        });
        learningLogs.push(lesson);
      } catch (e) {
        console.error('Learning generation failed:', e.message);
      }
    }

    // Update pending predictions for this match to resolved
    await db.execute({
      sql: "UPDATE predictions SET status = CASE WHEN status = 'won' THEN 'won' WHEN status = 'lost' THEN 'lost' ELSE 'pending' END WHERE match_id = ?",
      args: [matchId],
    });

    return NextResponse.json({
      success: true,
      result,
      predictionsProcessed: matchingPreds.rows.length,
      learnings: learningLogs,
    });
  } catch (error) {
    console.error('Result API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}