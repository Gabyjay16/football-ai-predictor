"use client";

import { useState, useEffect, useCallback } from "react";

const CACHE_KEY = 'football_ai_predictions';
const ROLLOVER_CACHE_KEY = 'football_ai_rollover';

export default function Home() {
  const [predictions, setPredictions] = useState([]);
  const [nextDay, setNextDay] = useState([]);
  const [nextDayTitle, setNextDayTitle] = useState(null);
  const [rollover, setRollover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Instant render from cache, then background refresh
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setPredictions(JSON.parse(cached));
      const cachedRoll = localStorage.getItem(ROLLOVER_CACHE_KEY);
      if (cachedRoll) setRollover(JSON.parse(cachedRoll));
    } catch (e) {
      console.error('Cache read error', e);
    }
    loadPredictions();
    loadRollover();
  }, []);

  const loadPredictions = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const url = force ? '/api/predictions?refresh=true' : '/api/predictions';
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const sorted = [...(data.predictions || [])].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      setPredictions(sorted);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(sorted)); } catch (e) {}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRollover = useCallback(async () => {
    try {
      const res = await fetch('/api/rollover');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRollover(data);
      try { localStorage.setItem(ROLLOVER_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
    } catch (e) {
      console.error('Rollover load error', e);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPredictions(true);
    await loadRollover();
    setRefreshing(false);
  };

  const handleShowNextDay = async () => {
    setLoadingNext(true);
    setError(null);
    const tomorrow = new Date(Date.now() + 86400000);
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const date = fmt(tomorrow);
    const label = tomorrow.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    try {
      const res = await fetch(`/api/predictions?date=${date}&refresh=true`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const sorted = [...(data.predictions || [])].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      setNextDay(sorted);
      setNextDayTitle(label);
      if (sorted.length === 0) setError(data.message || `No matches scheduled for ${label}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingNext(false);
    }
  };

  const pendingCount = predictions.filter(p => p.status === 'pending').length;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            ⚽ Football AI Predictor
          </h1>
          <p className="text-slate-400 mt-1">AI-powered betting analysis with self-learning</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/rollover" className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
            🎲 Rollover 2.0
          </a>
          <a href="/track" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm">
            🎯 Track Results
          </a>
          <a href="/history" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm">
            📚 History
          </a>
          <a href="/learn" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm">
            🧠 Learning
          </a>
          <button
            onClick={handleShowNextDay}
            disabled={loadingNext}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition text-sm"
          >
            {loadingNext ? 'Analyzing...' : '➡️ Next Day Matches'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition text-sm"
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
        <StatCard label="Total Predictions" value={predictions.length} icon="📊" />
        <StatCard label="Pending" value={pendingCount} icon="⏳" />
        <StatCard label="Won" value={predictions.filter(p => p.status === 'won').length} icon="✅" />
        <StatCard label="Lost" value={predictions.filter(p => p.status === 'lost').length} icon="❌" />
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Today&apos;s Predictions</h2>
          <a href="/history" className="text-blue-400 hover:text-blue-300 text-sm">
            View History →
          </a>
        </div>

        {loading && predictions.length === 0 ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-800 rounded-xl p-4 h-24"></div>
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400 mb-4">No predictions yet.</p>
            <button
              onClick={handleRefresh}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              🤖 Generate AI Predictions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.slice(0, 20).map((pred, i) => (
              <PredictionCard key={i} pred={pred} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">➡️ Next Day Predictions</h2>
          {nextDayTitle && (
            <span className="text-sm text-purple-300">{nextDayTitle}</span>
          )}
        </div>

        {nextDay.length === 0 ? (
          !nextDayTitle ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center border border-dashed border-slate-600">
              <p className="text-slate-400 mb-4">
                Analyze the matches scheduled for tomorrow.
              </p>
              <button
                onClick={handleShowNextDay}
                disabled={loadingNext}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {loadingNext ? '🔍 Analyzing next day matches...' : '🔍 Analyze Next Day Matches'}
              </button>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400 mb-4">
                No matches scheduled for {nextDayTitle}.
              </p>
              <button
                onClick={handleShowNextDay}
                disabled={loadingNext}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {loadingNext ? '🔍 Analyzing...' : '🔍 Retry Analysis'}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {nextDay.map((pred, i) => (
              <PredictionCard key={i} pred={pred} />
            ))}
          </div>
        )}
      </section>

      <RolloverPanel rollover={rollover} />

      <section className="bg-gradient-to-r from-green-900/40 to-blue-900/40 rounded-xl p-5 border border-green-800/30 mt-8">
        <h3 className="font-semibold text-green-300 mb-2">💡 How it works</h3>
        <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">
          <li>AI analyzes today&apos;s matches using team form, head-to-head, and historical patterns</li>
          <li>Generates 3-4 predictions per match with confidence scores</li>
          <li>After each match, results are recorded as Won or Lost</li>
          <li>AI learns from losing predictions and adjusts future analysis</li>
          <li>Daily Rollover 2.0 combines the safest picks to target ~2.0 odds</li>
        </ol>
      </section>
    </main>
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

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 flex items-center gap-4">
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-3xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
      </div>
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
  const kickoff = camTime(pred.kickoff);

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-700/50 transition">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {kickoff && (
            <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-purple-300 border border-slate-600" title="Kickoff (Cameroon time)">
              🕐 {kickoff}
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

function RolloverPanel({ rollover }) {
  const today = rollover?.today;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-white">🎲 Daily Rollover 2.0</h2>
        <a href="/rollover" className="text-green-400 hover:text-green-300 text-sm">
          View Full History →
        </a>
      </div>

      {!today || !today.selections || today.selections.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <p className="text-slate-400">
            No rollover available yet. Predictions need to be generated first.
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-900/40 to-slate-900 rounded-xl p-5 border border-green-800/40">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-white">Today&apos;s Accumulator</h3>
              <p className="text-xs text-slate-400">{today.roll_date}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">
                {today.combined_odds ? today.combined_odds.toFixed(2) : '—'}
              </div>
              <div className="text-xs text-slate-400">Combined Odds</div>
            </div>
          </div>

          <div className="space-y-2">
            {(today.selections || []).map((s, i) => (
              <div key={i} className="bg-slate-800/70 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white font-medium">
                    {i + 1}. {s.homeTeam} vs {s.awayTeam}
                    {s.kickoff && (
                      <span className="text-xs text-purple-300 ml-2">🕐 {camTime(s.kickoff)}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{s.expected || s.market}</div>
                </div>
                <div className="text-sm font-semibold text-blue-400">
                  {Math.round((s.confidence || 0) * 100)}%
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between bg-slate-900/60 rounded-lg p-3">
            <span className="text-sm text-slate-300">Estimated combined probability</span>
            <span className="text-lg font-bold text-green-400">
              {today.combined_probability ? (today.combined_probability * 100).toFixed(1) : '—'}%
            </span>
          </div>
        </div>
      )}

      {/* Recent rollover history (compact) */}
      {(rollover?.history || []).length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Recent Rollovers</h3>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-center font-medium">Odds</th>
                  <th className="px-3 py-2 text-center font-medium">Picks</th>
                  <th className="px-3 py-2 text-right font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900/50">
                {rollover.history.slice(0, 5).map((h, i) => {
                  const settled = h.selections?.every(s => s.won != null);
                  const won = settled && h.selections?.every(s => s.won === 1);
                  return (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-300">{h.roll_date}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{h.combined_odds?.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{h.selections?.length}</td>
                      <td className="px-3 py-2 text-right">
                        {!settled ? (
                          <span className="text-yellow-400">Pending</span>
                        ) : won ? (
                          <span className="text-green-400 font-semibold">✅ Won</span>
                        ) : (
                          <span className="text-red-400 font-semibold">❌ Lost</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}