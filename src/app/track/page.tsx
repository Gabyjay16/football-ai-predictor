"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TrackPage() {
  const [predictions, setPredictions] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/history');
      const json = await res.json();
      // Get pending predictions to track
      const pending = (json.predictions || []).filter(p => p.prediction_status === 'pending');
      setPredictions(pending);
    } catch (e) {
      console.error(e);
    }
  };

  // Group by unique match
  const uniqueMatches = [...new Map(
    predictions.map(p => [`${p.match_id}:${p.home_team}:${p.away_team}`, p])
  ).values()];

  const submitResult = async (e) => {
    e.preventDefault();
    if (!selectedMatch) { setMessage('Select a match first'); return; }
    if (homeScore === '' || awayScore === '') { setMessage('Enter scores'); return; }

    const [matchId, homeTeam, awayTeam] = selectedMatch.split(':');
    setProcessing(true);
    setMessage('');

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          homeTeam,
          awayTeam,
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage(`✅ Result recorded! ${json.predictionsProcessed} predictions processed. AI is now learning from this outcome.`);
        setHomeScore('');
        setAwayScore('');
        setSelectedMatch('');
        await loadData();
      } else {
        setMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">🎯 Track Match Results</h1>
        <p className="text-slate-400 mt-1">Record final scores to update predictions to Won/Lost</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm inline-block mt-2">
          ← Back to Dashboard
        </Link>
      </header>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.startsWith('✅')
            ? 'bg-green-900/50 border-green-500 text-green-200'
            : message.startsWith('Error')
              ? 'bg-red-900/50 border-red-500 text-red-200'
              : 'bg-yellow-900/50 border-yellow-500 text-yellow-200'
        } border`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <form onSubmit={submitResult} className="bg-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Select Match</label>
              <select
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600"
              >
                <option value="">Choose a match...</option>
                {uniqueMatches.map((m, i) => (
                  <option key={i} value={`${m.match_id}:${m.home_team}:${m.away_team}`}>
                    {m.home_team} vs {m.away_team} ({m.match_date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Home Team Score</label>
              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600"
                placeholder="e.g. 2"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Away Team Score</label>
              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600"
                placeholder="e.g. 1"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition"
            >
              {processing ? 'Recording...' : '📋 Record Result & Update AI'}
            </button>
          </form>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Pending Match Predictions</h2>
          {uniqueMatches.length === 0 ? (
            <p className="text-slate-400 text-sm">No pending predictions. Generate predictions from the dashboard first.</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {uniqueMatches.map((m, i) => (
                <li key={i} className="bg-slate-700 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm">{m.home_team} vs {m.away_team}</div>
                    <div className="text-xs text-slate-400">{m.match_date}</div>
                  </div>
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                    Pending
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="mt-8 bg-slate-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-2">How results update predictions</h3>
        <div className="text-sm text-slate-300 space-y-2">
          <p><span className="text-green-400 font-medium">Won</span> — Prediction matched the actual outcome (e.g. Over 1.5 when 2+ goals scored)</p>
          <p><span className="text-red-400 font-medium">Lost</span> — Prediction did not match the outcome</p>
          <p><span className="text-purple-400 font-medium">Learning</span> — AI generates a lesson for every lost prediction to avoid similar mistakes</p>
        </div>
      </section>
    </main>
  );
}