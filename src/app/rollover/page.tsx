"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function RolloverPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/rollover');
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

  const stats = data?.history?.reduce(
    (acc, h) => {
      if (h.status === 'won') acc.won++;
      else if (h.status === 'lost') acc.lost++;
      else acc.pending++;
      acc.total++;
      return acc;
    },
    { total: 0, won: 0, lost: 0, pending: 0 }
  );
  const winRate = stats && (stats.won + stats.lost) > 0
    ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(1)
    : '—';

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">🎲 Rollover 2.0 History</h1>
        <p className="text-slate-400 mt-1">Daily accumulators targeting ~2.0 odds</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm inline-block mt-2">
          ← Back to Dashboard
        </Link>
      </header>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Stat label="Total" value={stats.total} />
          <Stat label="Won" value={stats.won} color="text-green-400" />
          <Stat label="Lost" value={stats.lost} color="text-red-400" />
          <Stat label="Pending" value={stats.pending} color="text-yellow-400" />
          <Stat label="Win Rate" value={`${winRate}%`} color="text-blue-400" />
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 h-20"></div>
          ))}
        </div>
      ) : !data || data.history.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
          No rollover history yet. Generate predictions and a daily rollover will appear.
        </div>
      ) : (
        <div className="space-y-4">
          {data.history.map((h, i) => {
            const settled = h.selections?.every(s => s.won != null);
            const won = settled && h.selections?.every(s => s.won === 1);

            return (
              <div key={i} className={`bg-slate-800 rounded-xl p-4 border ${
                !settled ? 'border-slate-600/40' : won ? 'border-green-600/40' : 'border-red-600/40'
              }`}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-white">{h.roll_date}</span>
                    <span className="text-xs text-slate-400 ml-2">Combined odds {h.combined_odds?.toFixed(2)}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    !settled ? 'text-yellow-400' : won ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {!settled ? '⏳ Pending' : won ? '✅ Won' : '❌ Lost'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(h.selections || []).map((s, j) => (
                    <div key={j} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                      <div className="text-sm text-slate-300">
                        {s.homeTeam} vs {s.awayTeam}
                        {s.kickoff && (
                          <span className="text-purple-300 ml-2">🕐 {camTime(s.kickoff)}</span>
                        )}
                        <span className="text-slate-500 ml-2">— {s.expected || s.market}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{Math.round((s.confidence || 0) * 100)}%</span>
                        {s.won == null ? (
                          <span className="text-xs text-yellow-400">Pending</span>
                        ) : s.won === 1 ? (
                          <span className="text-xs text-green-400">✓</span>
                        ) : (
                          <span className="text-xs text-red-400">✗</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="mt-8 bg-gradient-to-r from-green-900/40 to-slate-900 rounded-xl p-5 border border-green-800/30">
        <h3 className="font-semibold text-green-300 mb-2">How Rollover 2.0 works</h3>
        <p className="text-sm text-slate-300">
          Each day, the system picks the <strong>highest-confidence predictions</strong> from all
          available matches and combines them until the total odds reach ~2.0. All selections in
          the accumulator must win for the slip to be Won. Results are tracked after each match.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value, color = "text-white" }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function camTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Douala',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}