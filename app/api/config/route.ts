import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 計算関数
function calculateBase(leanBodyMass: number) {
  const calories = leanBodyMass * 45;
  const protein = leanBodyMass * 3;
  const fat = (calories * 0.2) / 9;
  const carbs = (calories - protein * 4 - fat * 9) / 4;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
  };
}

// GET /api/config
export async function GET() {
  const row = db.prepare('SELECT * FROM user_config WHERE id = 1').get() as any;

  if (!row) {
    return NextResponse.json({
      lean_body_mass: null,
      base_calories: null,
      base_protein: null,
      base_fat: null,
      base_carbs: null,
    });
  }

  return NextResponse.json({
    lean_body_mass: row.lean_body_mass,
    base_calories: row.base_calories,
    base_protein: row.base_protein,
    base_fat: row.base_fat,
    base_carbs: row.base_carbs,
  });
}

// POST /api/config { lean_body_mass: number }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { lean_body_mass } = body;

  if (!lean_body_mass || lean_body_mass <= 0) {
    return NextResponse.json({ error: '除脂肪体重を正しく入力してください' }, { status: 400 });
  }

  const base = calculateBase(lean_body_mass);

  // UPSERT（あれば更新、なければ挿入）
  const existing = db.prepare('SELECT * FROM user_config WHERE id = 1').get();

  if (existing) {
    db.prepare(`
      UPDATE user_config 
      SET lean_body_mass = ?, base_calories = ?, base_protein = ?, base_fat = ?, base_carbs = ?, updated_at = datetime('now')
      WHERE id = 1
    `).run(lean_body_mass, base.calories, base.protein, base.fat, base.carbs);
  } else {
    db.prepare(`
      INSERT INTO user_config (id, lean_body_mass, base_calories, base_protein, base_fat, base_carbs)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(lean_body_mass, base.calories, base.protein, base.fat, base.carbs);
  }

  return NextResponse.json({
    lean_body_mass,
    ...base,
  });
}