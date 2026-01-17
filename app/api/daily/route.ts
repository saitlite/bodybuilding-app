import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// ...既存の import と GET, POST の下あたりに追記

// GET /api/daily?days=7 など → 直近N日分を返す
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const date = url.searchParams.get('date');
  const daysParam = url.searchParams.get('days');

  const dbInstance = db;

  // パターン1: dateが指定されている → 1日分取得（今まで通り）
  if (date) {
    const row = dbInstance
      .prepare('SELECT * FROM daily_records WHERE date = ?')
      .get(date) as any;

    if (!row) {
      return NextResponse.json({
        date,
        weight_am: null,
        weight_pm: null,
        memo: null,
      });
    }

    return NextResponse.json({
      date: row.date,
      weight_am: row.weight_am,
      weight_pm: row.weight_pm,
      memo: row.memo,
    });
  }

  // パターン2: days が指定されている → 直近N日分
  if (daysParam) {
    const days = parseInt(daysParam, 10) || 7;
    const rows = dbInstance
      .prepare(
        `SELECT date, weight_am 
         FROM daily_records 
         ORDER BY date DESC 
         LIMIT ?`
      )
      .all(days) as any[];

    // 日付の古い順に並べ替え
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

// POST /api/daily  { date, weight_am?, weight_pm? }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, weight_am, weight_pm, memo } = body;

  if (!date) {
    return NextResponse.json({ error: 'dateは必須です' }, { status: 400 });
  }

  // 既にレコードがあるか確認
  const existing = db
    .prepare('SELECT * FROM daily_records WHERE date = ?')
    .get(date) as any;

  if (existing) {
    // 更新
    db.prepare(
      'UPDATE daily_records SET weight_am = ?, weight_pm = ?, memo = ? WHERE date = ?'
    ).run(
      weight_am ?? existing.weight_am,
      weight_pm ?? existing.weight_pm,
      memo ?? existing.memo,
      date
    );
  } else {
    // 新規作成
    db.prepare(
      'INSERT INTO daily_records (date, weight_am, weight_pm, memo) VALUES (?, ?, ?, ?)'
    ).run(date, weight_am ?? null, weight_pm ?? null, memo ?? null);
  }

  return NextResponse.json({ success: true });
}

