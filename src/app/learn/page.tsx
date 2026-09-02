"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LearnPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/learnings');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">🧠 AI Learning Log</h1>
        <p className="text-slate-400 mt-1">Every prediction outcome teaches the AI something new</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm inline-block mt-2">
          ← Back to Dashboard
        </Link>
      </header>

      {data?.stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white">{data.stats.total_logs}</div>
            <div className="text-xs text-slate-400">Lessons Learned</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{data.stats.won}</div>
            <div className="text-xs text-slate-400">Successful</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{data.stats.lost}</div>
            <div className="text-xs text-slate-400">Mistakes to Learn From</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 h-16"></div>
          ))}
        </div>
      ) : !data || data.lessons.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
          No learning data yet. Record match results and the AI will start learning from its predictions.
        </div>
      ) : (
        <div className="space-y-3">
          {data.lessons.map((lesson, i) => (
            <div key={i} className={`bg-slate-800 rounded-xl p-4 border ${
              lesson.won ? 'border-green-600/30' : 'border-red-600/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${lesson.won ? 'text-green-400' : 'text-red-400'}`}>
                  {lesson.won ? '✅ Won' : '❌ Lost'}
                </span>
                <span className="text-xs text-slate-500">
                  {lesson.home_team} vs {lesson.away_team}
                </span>
              </div>
              <div className="text-sm text-slate-300 mb-1">
                <span className="text-slate-400">Market:</span> {lesson.market || 'unknown'}
              </div>
              <div className="text-sm text-white font-medium mb-1">
                <span className="text-purple-400">Lesson:</span> {lesson.lesson || 'No lesson recorded'}
              </div>
              <div className="text-xs text-slate-500">
                <span className="text-slate-400">Reason:</span> {lesson.reason || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}