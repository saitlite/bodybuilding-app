import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

// ...既存の import と GET, POST の下あたりに追記

// GET /api/daily?days=7 など → 直近N日分を返す
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const date = url.searchParams.get('date');
  const daysParam = url.searchParams.get('days');

  // パターン1: dateが指定されている → 1日分取得（今まで通り）
  if (date) {
    const row = await db.get('SELECT * FROM daily_records WHERE date = ?', [date]) as any;

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
      sleep_hours: row.sleep_hours,
      cardio_minutes: row.cardio_minutes,
    });
  }

  // パターン2: days が指定されている → 指定期間内のデータ
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
      `SELECT date, weight_am, sleep_hours, cardio_minutes
       FROM daily_records
       WHERE date >= ? AND date <= ?
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

// POST /api/daily  { date, weight_am?, weight_pm?, memo?, sleep_hours?, cardio_minutes? }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, weight_am, weight_pm, memo, sleep_hours, cardio_minutes } = body;

  if (!date) {
    return NextResponse.json({ error: 'dateは必須です' }, { status: 400 });
  }

  // 既にレコードがあるか確認
  const existing = await db.get('SELECT * FROM daily_records WHERE date = ?', [date]) as any;

  if (existing) {
    // 更新
    await db.execute(
      'UPDATE daily_records SET weight_am = ?, weight_pm = ?, memo = ?, sleep_hours = ?, cardio_minutes = ? WHERE date = ?',
      [
        weight_am ?? existing.weight_am,
        weight_pm ?? existing.weight_pm,
        memo ?? existing.memo,
        sleep_hours ?? existing.sleep_hours,
        cardio_minutes ?? existing.cardio_minutes,
        date
      ]
    );
  } else {
    // 新規作成
    await db.execute(
      'INSERT INTO daily_records (date, weight_am, weight_pm, memo, sleep_hours, cardio_minutes) VALUES (?, ?, ?, ?, ?, ?)',
      [date, weight_am ?? null, weight_pm ?? null, memo ?? null, sleep_hours ?? null, cardio_minutes ?? null]
    );
  }

  return NextResponse.json({ success: true });
}

