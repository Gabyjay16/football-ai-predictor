const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.7-flash';

export async function analyzeMatches(matches, learningContext = '') {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const matchesJson = JSON.stringify(matches);

  const prompt = `
You are a professional football betting analyst. Your job is to analyze football matches and provide accurate betting predictions.

CONTEXT FROM PAST LESSONS:
${learningContext || 'No previous lessons yet - this is the first day.'}

TODAY'S MATCHES:
${matchesJson}

For each match, provide your best market selections. Consider ALL of these markets and cover as many as possible:
1. Over 1.5 goals - usually safe (75-85% hit rate) -> market "over_1.5"
2. Under 4.5 goals - very safe bet most of the time -> market "under_4.5"
3. Under 3.5 goals - when both teams are defensive -> market "under_3.5"
4. Double Chance - when one team is clearly stronger -> market "double_chance_1x" (home/draw) or "double_chance_x2" (away/draw)
5. Straight Win - only when one team has huge advantage -> market "straight_win_1" (home win) or "straight_win_2" (away win)

Important: spread your predictions across ALL FIVE market types so we have at least a few bets for each market. Prefer safer markets (over_1.5, under_4.5) but ALWAYS include some double_chance and straight_win picks too. Aim the confidence so most are above 0.60.

Respond with ONLY valid JSON array, one object per match, exactly matching this format:
[
  {
    "matchId": "match-id-from-input",
    "homeTeam": "team name",
    "awayTeam": "team name",
    "predictions": [
      {
        "market": "over_1.5",
        "expected": "Over 1.5 goals at FT",
        "confidence": 0.88,
        "reasoning": "short reason"
      },
      {
        "market": "under_4.5",
        "expected": "Under 4.5 goals at FT",
        "confidence": 0.85,
        "reasoning": "short reason"
      },
      {
        "market": "double_chance_1x",
        "expected": "Home or Draw",
        "confidence": 0.78,
        "reasoning": "short reason"
      }
    ]
  }
]

Rules:
- Include markets ONLY if you are reasonably confident (confidence >= 0.60)
- Max 5 predictions per match
- Try to cover all 5 market types across the whole set of matches
- The BEST selection should have the highest confidence
`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://football-ai.vercel.app',
      'X-Title': 'Football AI Predictor',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a football betting analyst. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse the JSON response
  try {
    // The content might be wrapped in markdown code fences
    const cleaned = content.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response: ' + e.message);
  }
}

export async function generateLearningLesson(prediction, actualResult) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { lesson: 'Learning skipped - no API key', reason: 'API key missing' };

  const prompt = `
You are analyzing why a previous betting prediction was wrong.

PREDICTION:
- Match: ${prediction.home_team} vs ${prediction.away_team}
- Market: ${prediction.market}
- Expected: ${prediction.expected || prediction.prediction}
- Confidence: ${prediction.confidence}

ACTUAL RESULT:
- Home score: ${actualResult.home_score}
- Away score: ${actualResult.away_score}
- Result: ${actualResult.result}
${prediction.status === 'won' ? 'The prediction WON.' : 'The prediction LOST.'}

Provide a one-sentence lesson and a one-line reason. Respond as JSON:
{
  "lesson": "what to learn from this",
  "reason": "why the result happened"
}
`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You analyze betting outcomes. Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!response.ok) return { lesson: 'Could not generate', reason: 'API error' };

  const data = await response.json();
  const content = data.choices[0].message.content;
  try {
    const cleaned = content.replace(/```json\n/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { lesson: content.slice(0, 200), reason: 'Parse error' };
  }
}