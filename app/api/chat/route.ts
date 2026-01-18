import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

export async function POST(request: NextRequest) {
  console.log('=== Chat API Called ===');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { message, date } = body;

    if (!message) {
      return NextResponse.json({ error: 'メッセージは必須です' }, { status: 400 });
    }

    // 現在のデータを取得（要約用）
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // 当日のデータ
    const dailyRecord = await db.get('SELECT * FROM daily_records WHERE date = ?', [targetDate]) as any;
    
    const foods = await db.all('SELECT * FROM food_logs WHERE date = ? ORDER BY created_at DESC', [targetDate]) as any[];
    
    // 直近7日のデータ（要約）
    // PostgreSQLでは日付計算の方法が異なるため、JavaScriptで計算
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const recentFoods = await db.all(`
      SELECT date, SUM(calories) as total_calories, SUM(protein) as total_protein,
             SUM(fat) as total_fat, SUM(carbs) as total_carbs
      FROM food_logs
      WHERE date >= ?
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `, [sevenDaysAgoStr]) as any[];
    
    const recentWeights = await db.all(`
      SELECT date, weight_am
      FROM daily_records
      WHERE date >= ? AND weight_am IS NOT NULL
      ORDER BY date DESC
      LIMIT 7
    `, [sevenDaysAgoStr]) as any[];
    
    // 設定値
    const config = await db.get('SELECT * FROM user_config WHERE id = 1', []) as any;
    
    // コンテキスト要約
    const todayTotal = foods.reduce((acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      protein: acc.protein + (f.protein || 0),
      fat: acc.fat + (f.fat || 0),
      carbs: acc.carbs + (f.carbs || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
    
    const contextSummary = `
【当日情報 (${targetDate})】
- 体重（朝）: ${dailyRecord?.weight_am ? `${dailyRecord.weight_am} kg` : '未記録'}
- 本日の摂取: カロリー ${todayTotal.calories.toFixed(0)} kcal, P ${todayTotal.protein.toFixed(1)} g, F ${todayTotal.fat.toFixed(1)} g, C ${todayTotal.carbs.toFixed(1)} g
- 本日の食事: ${foods.length}件 (${foods.slice(0, 3).map(f => `${f.food_name} ${f.amount}${f.unit}`).join(', ')}${foods.length > 3 ? '...' : ''})
${dailyRecord?.memo ? `- メモ: ${dailyRecord.memo}` : ''}

【目標値】
${config ? `- 目標カロリー: ${config.base_calories} kcal, P ${config.base_protein} g, F ${config.base_fat} g, C ${config.base_carbs} g` : '- 未設定'}

【直近7日の傾向】
- 体重推移: ${recentWeights.map(w => `${w.date.slice(5)}: ${w.weight_am}kg`).join(', ') || 'データ不足'}
- カロリー平均: ${recentFoods.length > 0 ? (recentFoods.reduce((acc, d) => acc + d.total_calories, 0) / recentFoods.length).toFixed(0) : '不明'} kcal/日
`;

    // Azure OpenAI 呼び出し
    if (!process.env.AZURE_ENDPOINT || !process.env.AZURE_API_KEY) {
      return NextResponse.json({ error: '環境変数が未設定です' }, { status: 500 });
    }

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
            content: `あなたは現代で最も知識のある栄養学者です。また、ナチュラルボディビル日本１位の実績もあり、鈴木雅などを凌駕する知見や経験を持っています。ボディメイクに関しては隙がありません。
ユーザーの減量とボディメイクをサポートし、具体的で実用的なアドバイスを提供してください。
回答は簡潔に、200字以内でまとめてください。`,
          },
          {
            role: 'user',
            content: `${contextSummary}\n\n質問: ${message}`,
          },
        ],
        max_completion_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'AI API Error', 
        status: response.status,
        details: errorText 
      }, { status: 500 });
    }

    const json = await response.json();
    const aiMessage = json.choices?.[0]?.message?.content || 'エラー: 応答を取得できませんでした';

    return NextResponse.json({ message: aiMessage });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
