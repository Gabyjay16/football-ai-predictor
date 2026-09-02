import { NextResponse } from "next/server";
import { initDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await initDb();

    // Get predictions from last 7 days with results
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const predictions = await db.execute({
      sql: `SELECT p.*, 
            m.home_score as actual_home,
            m.away_score as actual_away,
            m.result as actual_result,
            CASE 
              WHEN m.home_score IS NULL THEN 'pending'
              WHEN p.prediction LIKE '%Over 1.5%' AND (m.home_score + m.away_score) >= 2 THEN 'won'
              WHEN p.prediction LIKE '%Over 1.5%' AND (m.home_score + m.away_score) < 2 THEN 'lost'
              WHEN p.prediction LIKE '%Under 4.5%' AND (m.home_score + m.away_score) <= 4 THEN 'won'
              WHEN p.prediction LIKE '%Under 4.5%' AND (m.home_score + m.away_score) > 4 THEN 'lost'
              WHEN p.prediction LIKE '%Under 3.5%' AND (m.home_score + m.away_score) <= 3 THEN 'won'
              WHEN p.prediction LIKE '%Under 3.5%' AND (m.home_score + m.away_score) > 3 THEN 'lost'
              WHEN p.prediction LIKE '%Home or Draw%' AND (m.home_score >= m.away_score) THEN 'won'
              WHEN p.prediction LIKE '%Home or Draw%' AND (m.home_score < m.away_score) THEN 'lost'
              WHEN p.prediction LIKE '%Away or Draw%' AND (m.away_score >= m.home_score) THEN 'won'
              WHEN p.prediction LIKE '%Away or Draw%' AND (m.away_score < m.home_score) THEN 'lost'
              WHEN p.prediction LIKE '%Home Win%' AND m.home_score > m.away_score THEN 'won'
              WHEN p.prediction LIKE '%Home Win%' AND m.home_score <= m.away_score THEN 'lost'
              WHEN p.prediction LIKE '%Away Win%' AND m.away_score > m.home_score THEN 'won'
              WHEN p.prediction LIKE '%Away Win%' AND m.away_score <= m.home_score THEN 'lost'
              ELSE 'pending'
            END as prediction_status
            FROM predictions p
            LEFT JOIN match_results m ON p.match_id = m.match_id
            WHERE p.match_date >= ?
            ORDER BY p.match_date DESC, p.created_at DESC`,
      args: [sevenDaysAgo],
    });

    // Calculate stats
    const total = predictions.rows.length;
    const won = predictions.rows.filter(p => p.prediction_status === 'won').length;
    const lost = predictions.rows.filter(p => p.prediction_status === 'lost').length;
    const pending = predictions.rows.filter(p => p.prediction_status === 'pending').length;
    const winRate = total > 0 ? ((won / (won + lost)) * 100).toFixed(1) : 0;

    return NextResponse.json({
      predictions: predictions.rows,
      stats: { total, won, lost, pending, winRate },
    });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}