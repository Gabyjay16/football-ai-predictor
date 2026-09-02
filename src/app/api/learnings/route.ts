import { NextResponse } from "next/server";
import { initDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await initDb();

    const lessons = await db.execute(`
      SELECT l.*, p.home_team, p.away_team, p.match_date
      FROM learning_log l
      LEFT JOIN predictions p ON l.prediction_id = p.id
      ORDER BY l.logged_at DESC
      LIMIT 50
    `);

    const summary = await db.execute(`
      SELECT 
        COUNT(*) as total_logs,
        SUM(won) as won,
        COUNT(*) - SUM(won) as lost
      FROM learning_log
    `);

    return NextResponse.json({
      lessons: lessons.rows,
      stats: summary.rows[0] || { total_logs: 0, won: 0, lost: 0 },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}