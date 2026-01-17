import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('=== Nutrition API Called ===');

  try {
    const body = await request.json();
    console.log('Request Body:', body);

    const { food_name, amount, unit } = body;

    // 環境変数の確認
    console.log('AZURE_ENDPOINT:', process.env.AZURE_ENDPOINT ? '設定あり' : '未設定');
    console.log('AZURE_API_KEY:', process.env.AZURE_API_KEY ? '設定あり' : '未設定');

    if (!process.env.AZURE_ENDPOINT || !process.env.AZURE_API_KEY) {
      return NextResponse.json({ error: '環境変数が未設定です' }, { status: 500 });
    }

    // AI API呼び出し
    console.log('Calling Azure OpenAI...');

    const response = await fetch(process.env.AZURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_API_KEY,
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
- 食材名: ${food_name}
- 量: ${amount}
- 単位: ${unit}

次のJSON形式だけを返してください。余計な文章は一切書かないでください。

{
  "calories": 数値,   // kcal
  "protein": 数値,    // g
  "fat": 数値,        // g
  "carbs": 数値,      // g
  "score": 数値       // 0〜100の栄養スコア
}

単位は全て数値だけにしてください。文字列（"kcal"や"g"など）は入れないでください。`
    },
  ],
  max_completion_tokens: 150,
  temperature: 0.2,
}),
    });

    console.log('Response Status:', response.status);

    const responseText = await response.text();
    console.log('Response Text:', responseText);

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'AI API Error', 
        status: response.status,
        details: responseText 
      }, { status: 500 });
    }
const json = JSON.parse(responseText);
const content = json.choices?.[0]?.message?.content || '';

console.log('AI Content:', content);

let parsed: any;
try {
  parsed = JSON.parse(content);
} catch (e) {
  console.error('JSON parse error:', e);
  return NextResponse.json(
    { error: 'AIレスポンスのJSONパースに失敗しました', raw: content },
    { status: 500 }
  );
}

const nutrition = {
  calories: Number(parsed.calories) || 0,
  protein: Number(parsed.protein) || 0,
  fat: Number(parsed.fat) || 0,
  carbs: Number(parsed.carbs) || 0,
  score: Number(parsed.score) || 0,
  source: 'ai' as const,
};

console.log('Parsed Nutrition:', nutrition);

return NextResponse.json(nutrition);

    console.log('Parsed Nutrition:', nutrition);

    return NextResponse.json(nutrition);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}