"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/history');
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

  const filtered = data?.predictions?.filter(p => {
    if (filter === 'all') return true;
    return p.prediction_status === filter;
  }) || [];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">📚 Prediction History</h1>
          <p className="text-slate-400 mt-1">Last 7 days of predictions & results</p>
        </div>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to Dashboard
        </Link>
      </header>

      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white">{data.stats.total}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{data.stats.won}</div>
            <div className="text-xs text-slate-400">Won</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{data.stats.lost}</div>
            <div className="text-xs text-slate-400">Lost</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{data.stats.pending}</div>
            <div className="text-xs text-slate-400">Pending</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{data.stats.winRate}%</div>
            <div className="text-xs text-slate-400">Win Rate</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {['all', 'won', 'lost', 'pending'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm capitalize ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 h-20"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
          No {filter !== 'all' ? filter : ''} predictions found in the last 7 days.
          <br />
          <span className="text-sm mt-2 inline-block">
            Generate predictions from the dashboard and they&apos;ll appear here once matches finish.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <HistoryRow key={i} p={p} />
          ))}
        </div>
      )}

      <section className="mt-10 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-xl p-5 border border-purple-800/30">
        <h3 className="font-semibold text-purple-300 mb-2">🧠 Self-Learning Engine</h3>
        <p className="text-sm text-slate-300">
          The AI analyzes every lost prediction to understand why it was wrong. This knowledge is
          fed back into future analysis, making recommendations smarter over time. Check the
          learning log on the dashboard after matches conclude.
        </p>
      </section>
    </main>
  );
}

function HistoryRow({ p }) {
  const status = p.prediction_status || 'pending';
  const isWon = status === 'won';
  const isLost = status === 'lost';

  return (
    <div className={`bg-slate-800 rounded-lg p-3 flex items-center gap-3 border ${
      isWon ? 'border-green-600/30' : isLost ? 'border-red-600/30' : 'border-slate-600/30'
    }`}>
      <span className="text-2xl">
        {isWon ? '✅' : isLost ? '❌' : '⏳'}
      </span>
      <div className="flex-1">
        <div className="font-medium text-white">{p.home_team} vs {p.away_team}</div>
        <div className="text-xs text-slate-400">{p.prediction}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">
          {isWon && <span className="text-green-400">WON</span>}
          {isLost && <span className="text-red-400">LOST</span>}
          {!isWon && !isLost && <span className="text-yellow-400">Pending</span>}
        </div>
        {p.actual_home !== null && (
          <div className="text-xs text-slate-400">
            Final: {p.actual_home} - {p.actual_away}
          </div>
        )}
        <div className="text-[10px] text-slate-500">{p.match_date}</div>
      </div>
    </div>
  );
}