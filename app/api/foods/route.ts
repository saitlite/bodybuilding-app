import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const date = url.searchParams.get('date');
  const daysParam = url.searchParams.get('days');

  // パターン1: date指定 → その日の食材一覧と合計
  if (date) {
    const foods = db
      .prepare('SELECT * FROM food_logs WHERE date = ? ORDER BY created_at DESC')
      .all(date);

    const totals = (foods as any[]).reduce(
      (acc, f) => ({
        calories: acc.calories + (f.calories || 0),
        protein: acc.protein + (f.protein || 0),
        fat: acc.fat + (f.fat || 0),
        carbs: acc.carbs + (f.carbs || 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    return NextResponse.json({ foods, totals });
  }

  // パターン2: days指定 → 直近N日分の日別カロリー合計
  if (daysParam) {
    const days = parseInt(daysParam, 10) || 7;

    const rows = db
      .prepare(
        `SELECT 
           date,
           SUM(calories) as total_calories,
           SUM(protein) as total_protein,
           SUM(fat) as total_fat,
           SUM(carbs) as total_carbs
         FROM food_logs
         GROUP BY date
         ORDER BY date DESC
         LIMIT ?`
      )
      .all(days) as any[];

    // 古い順に並べ替え
    rows.reverse();

    return NextResponse.json({
      days,
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

  const result = db
    .prepare(
      `INSERT INTO food_logs (date, food_name, amount, unit, calories, protein, fat, carbs, score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.date,
      body.food_name,
      body.amount,
      body.unit,
      body.calories,
      body.protein,
      body.fat,
      body.carbs,
      body.score
    );

  return NextResponse.json({ id: result.lastInsertRowid });
}