"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MARKETS, getMarket, englishTime } from "../../../lib/markets";

export default function MarketPage() {
  const params = useParams();
  const market = getMarket(params.market);

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const MIN_CONFIDENCE = 0.60;

  const load = useCallback(async (force = false) => {
    if (!market) return;
    setLoading(true);
    setError(null);
    try {
      const base = `/api/predictions?market=${market.slug}&minConfidence=${MIN_CONFIDENCE}&date=${date}`;
      const res = await fetch(force ? `${base}&refresh=true` : base);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const sorted = [...(data.predictions || [])].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      setPredictions(sorted);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [market, date]);

  useEffect(() => {
    load();
  }, [load]);

  if (!market) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
          Unknown market.
        </div>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">← Back</Link>
      </main>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const avgConfidence = predictions.length
    ? Math.round((predictions.reduce((a, p) => a + (p.confidence || 0), 0) / predictions.length) * 100)
    : 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            {market.emoji} {market.name} Predictions
          </h1>
          <p className="text-slate-400 mt-1">{market.description} · Confidence ≥ {Math.round(MIN_CONFIDENCE * 100)}%</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm inline-block mt-2">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label={`${market.short} Picks`} value={predictions.length} />
        <Stat label="Avg Confidence" value={predictions.length ? `${avgConfidence}%` : '—'} color="text-blue-400" />
        <Stat label="Won" value={predictions.filter(p => p.status === 'won').length} color="text-green-400" />
        <Stat label="Lost" value={predictions.filter(p => p.status === 'lost').length} color="text-red-400" />
      </div>

      {loading && predictions.length === 0 ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 h-24"></div>
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <div className={`bg-gradient-to-r ${market.gradient} rounded-xl p-8 text-center border ${market.border}`}>
          <p className="text-slate-300 mb-4">
            No {market.name.toLowerCase()} picks with confidence ≥ {Math.round(MIN_CONFIDENCE * 100)}% for this date.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {refreshing ? '🔍 Analyzing...' : '🔍 Generate More Picks'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {predictions.map((pred, i) => (
            <PredictionCard key={i} pred={pred} />
          ))}
        </div>
      )}

      {/* Other markets quick nav */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white mb-4">Other Markets</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {MARKETS.filter(m => m.slug !== market.slug).map(m => (
            <Link
              key={m.slug}
              href={`/market/${m.slug}`}
              className={`bg-gradient-to-r ${m.gradient} border ${m.border} rounded-xl p-4 text-center hover:opacity-90 transition`}
            >
              <div className="text-2xl">{m.emoji}</div>
              <div className="text-sm font-semibold text-white mt-1">{m.short}</div>
            </Link>
          ))}
        </div>
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

function PredictionCard({ pred }) {
  const statusColor = {
    'won': 'bg-green-500/20 text-green-300 border-green-500/50',
    'lost': 'bg-red-500/20 text-red-300 border-red-500/50',
    'pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  }[pred.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/50';

  const confidence = Math.round((pred.confidence || 0) * 100);
  const time = englishTime(pred.kickoff);

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-700/50 transition">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {time && (
            <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-yellow-300 border border-slate-600" title="Kickoff (Cameroon time)">
              🕐 {time}
            </span>
          )}
          {pred.actual_home != null && (
            <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-200 border border-slate-600">
              FT {pred.actual_home} - {pred.actual_away}
            </span>
          )}
          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
            {pred.competition}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${statusColor}`}>
            {pred.status === 'pending' ? 'Pending' : pred.status.toUpperCase()}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-white">
          {pred.home_team} <span className="text-slate-500">vs</span> {pred.away_team}
        </h3>
        <p className="text-sm text-slate-300 mt-1">{pred.prediction}</p>
        <p className="text-xs text-slate-500 mt-1">{pred.match_date}</p>
      </div>
      <div className="flex items-center gap-3 min-w-[120px] justify-end">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{confidence}%</div>
          <div className="text-xs text-slate-500">Confidence</div>
        </div>
        {confidence >= 85 && <span className="text-xl">🔥</span>}
      </div>
    </div>
  );
}