"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/predictions');
      const data = await res.json();
      if (data.error) setError(data.error);
      else setPredictions(data.predictions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

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
            onClick={loadPredictions}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition text-sm"
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Predictions" value={predictions.length} icon="📊" />
        <StatCard label="Pending" value={predictions.filter(p => p.status === 'pending').length} icon="⏳" />
        <StatCard label="To Track Today" value={predictions.filter(p => p.status !== 'won' && p.status !== 'lost').length} icon="🎯" />
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Today&apos;s Predictions</h2>
          <a href="/history" className="text-blue-400 hover:text-blue-300 text-sm">
            View History →
          </a>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-800 rounded-xl p-4 h-24"></div>
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400 mb-4">No predictions yet for today.</p>
            <button
              onClick={async () => {
                setLoading(true);
                await fetch('/api/predictions?refresh=true');
                await loadPredictions();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              🤖 Generate AI Predictions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.slice(0, 15).map((pred, i) => (
              <PredictionCard key={i} pred={pred} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-gradient-to-r from-green-900/40 to-blue-900/40 rounded-xl p-5 border border-green-800/30">
        <h3 className="font-semibold text-green-300 mb-2">💡 How it works</h3>
        <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">
          <li>AI analyzes today&apos;s matches using team form, head-to-head, and historical patterns</li>
          <li>Generates 3-4 predictions per match with confidence scores</li>
          <li>After each match, results are recorded as Won or Lost</li>
          <li>AI learns from losing predictions and adjusts future analysis</li>
          <li>The model improves daily as it accumulates match results</li>
        </ol>
      </section>
    </main>
  );
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

function PredictionCard({ pred, index }) {
  const statusColor = {
    'won': 'bg-green-500/20 text-green-300 border-green-500/50',
    'lost': 'bg-red-500/20 text-red-300 border-red-500/50',
    'pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  }[pred.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/50';

  const confidence = Math.round(pred.confidence * 100);

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-700/50 transition">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
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