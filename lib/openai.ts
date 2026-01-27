import db from './db';

interface NutritionData {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  score: number;
  source: 'ai' | 'cache';
}

export async function getNutrition(
  foodName: string,
  amount: number,
  unit: string
): Promise<NutritionData> {
  const cacheKey = `${foodName}_${amount}_${unit}`;

  // 1. キャッシュ確認
  const cached = db.prepare(
    'SELECT * FROM food_cache WHERE cache_key = ?'
  ).get(cacheKey) as any;

  if (cached) {
    return {
      calories: cached.calories,
      protein: cached.protein,
      fat: cached.fat,
      carbs: cached.carbs,
      score: cached.score,
      source: 'cache',
    };
  }

  // 2. AI API呼び出し
  const response = await fetch(process.env.AZURE_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.AZURE_API_KEY!,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'あなたは食材の栄養情報を提供するAIアシスタントです。',
        },
        {
          role: 'user',
          content: `以下の食材について教えてください。
- 食材名: ${foodName}
- 量: ${amount}
- 単位: ${unit}

以下の形式で回答してください（数値のみ）:
カロリー: [数値]
タンパク質: [数値]
脂質: [数値]
炭水化物: [数値]
栄養素的スコア: [数値]

余計なコメントは不要です。存在しない食材でも推定値を出力してください。`,
        },
      ],
      max_completion_tokens: 150,
      temperature: 0.2,
    }),
  });

  const json = await response.json();
  const content = json.choices[0].message.content;

  // 3. パース
  const nutrition = parseNutrition(content);

  // 4. キャッシュ保存
  db.prepare(`
    INSERT INTO food_cache (cache_key, calories, protein, fat, carbs, score)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    cacheKey,
    nutrition.calories,
    nutrition.protein,
    nutrition.fat,
    nutrition.carbs,
    nutrition.score
  );

  return { ...nutrition, source: 'ai' };
}

function parseNutrition(text: string) {
  const extract = (key: string) => {
    const match = text.match(new RegExp(`${key}\\s*[:：]\\s*約?\\s*(\\d+(?:\\.\\d+)?)`));
    return match ? parseFloat(match[1]) : 0;
  };

  return {
    calories: extract('カロリー'),
    protein: extract('タンパク質'),
    fat: extract('脂質'),
    carbs: extract('炭水化物'),
    score: extract('スコア'),
  };
}