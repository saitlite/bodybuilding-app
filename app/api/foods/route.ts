import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const date = url.searchParams.get('date');
  const daysParam = url.searchParams.get('days');

  // パターン1: date指定 → その日の食材一覧と合計
  if (date) {
    const foods = await db.all('SELECT * FROM food_logs WHERE date = ? ORDER BY created_at DESC', [date]);

    const totals = (foods as any[]).reduce(
      (acc, f) => ({
        calories: acc.calories + (f.calories || 0),
        protein: acc.protein + (f.protein || 0),
        fat: acc.fat + (f.fat || 0),
        carbs: acc.carbs + (f.carbs || 0),
        vitamin_a: acc.vitamin_a + (f.vitamin_a || 0),
        vitamin_c: acc.vitamin_c + (f.vitamin_c || 0),
        vitamin_d: acc.vitamin_d + (f.vitamin_d || 0),
        vitamin_e: acc.vitamin_e + (f.vitamin_e || 0),
        vitamin_b1: acc.vitamin_b1 + (f.vitamin_b1 || 0),
        vitamin_b2: acc.vitamin_b2 + (f.vitamin_b2 || 0),
        vitamin_b6: acc.vitamin_b6 + (f.vitamin_b6 || 0),
        vitamin_b12: acc.vitamin_b12 + (f.vitamin_b12 || 0),
        calcium: acc.calcium + (f.calcium || 0),
        iron: acc.iron + (f.iron || 0),
        potassium: acc.potassium + (f.potassium || 0),
        magnesium: acc.magnesium + (f.magnesium || 0),
        zinc: acc.zinc + (f.zinc || 0),
        choline: acc.choline + (f.choline || 0),
      }),
      {
        calories: 0, protein: 0, fat: 0, carbs: 0,
        vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0,
        vitamin_b1: 0, vitamin_b2: 0, vitamin_b6: 0, vitamin_b12: 0,
        calcium: 0, iron: 0, potassium: 0, magnesium: 0, zinc: 0, choline: 0
      }
    );

    return NextResponse.json({ foods, totals });
  }

  // パターン2: days指定 → 指定期間内の日別カロリー合計
  if (daysParam) {
    const days = parseInt(daysParam, 10) || 7;
    
    // 今日の日付と開始日を計算
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    
    // YYYY-MM-DD形式に変換
    const endDateStr = today.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    const rows = await db.all(
      `SELECT
         date,
         SUM(calories) as total_calories,
         SUM(protein) as total_protein,
         SUM(fat) as total_fat,
         SUM(carbs) as total_carbs,
         SUM(vitamin_a) as total_vitamin_a,
         SUM(vitamin_c) as total_vitamin_c,
         SUM(vitamin_d) as total_vitamin_d,
         SUM(vitamin_e) as total_vitamin_e,
         SUM(vitamin_b1) as total_vitamin_b1,
         SUM(vitamin_b2) as total_vitamin_b2,
         SUM(vitamin_b6) as total_vitamin_b6,
         SUM(vitamin_b12) as total_vitamin_b12,
         SUM(calcium) as total_calcium,
         SUM(iron) as total_iron,
         SUM(potassium) as total_potassium,
         SUM(magnesium) as total_magnesium,
         SUM(zinc) as total_zinc,
         SUM(choline) as total_choline
       FROM food_logs
       WHERE date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date ASC`,
      [startDateStr, endDateStr]
    ) as any[];

    return NextResponse.json({
      days,
      startDate: startDateStr,
      endDate: endDateStr,
      records: rows,
    });
  }

  return NextResponse.json(
    { error: 'date か days のどちらかを指定してください' },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = await db.execute(
    `INSERT INTO food_logs (
      date, food_name, amount, unit, calories, protein, fat, carbs, score,
      vitamin_a, vitamin_c, vitamin_d, vitamin_e,
      vitamin_b1, vitamin_b2, vitamin_b6, vitamin_b12,
      calcium, iron, potassium, magnesium, zinc, choline
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.date,
      body.food_name,
      body.amount,
      body.unit,
      body.calories,
      body.protein,
      body.fat,
      body.carbs,
      body.score,
      body.vitamin_a || 0,
      body.vitamin_c || 0,
      body.vitamin_d || 0,
      body.vitamin_e || 0,
      body.vitamin_b1 || 0,
      body.vitamin_b2 || 0,
      body.vitamin_b6 || 0,
      body.vitamin_b12 || 0,
      body.calcium || 0,
      body.iron || 0,
      body.potassium || 0,
      body.magnesium || 0,
      body.zinc || 0,
      body.choline || 0
    ]
  );

  return NextResponse.json({ id: result.lastInsertId });
}