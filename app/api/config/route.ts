import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

// 基礎代謝計算関数（身長・体重・年齢から）
// 10 × 体重(kg) + 6.25 × 身長(cm) - 5 × 年齢
function calculateBasalMetabolicRate(weight: number, height: number, age: number) {
  return 10 * weight + 6.25 * height - 5 * age;
}

// PFCバランス計算関数（除脂肪体重から）
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
  const row = await db.get('SELECT * FROM user_config WHERE id = 1', []) as any;

  if (!row) {
    return NextResponse.json({
      lean_body_mass: null,
      height: null,
      weight: null,
      age: null,
      basal_metabolic_rate: null,
      base_calories: null,
      base_protein: null,
      base_fat: null,
      base_carbs: null,
    });
  }

  // 身長・体重・年齢があれば基礎代謝を計算
  let basalMetabolicRate = null;
  if (row.height && row.weight && row.age) {
    basalMetabolicRate = Math.round(calculateBasalMetabolicRate(row.weight, row.height, row.age));
  }

  return NextResponse.json({
    lean_body_mass: row.lean_body_mass,
    height: row.height,
    weight: row.weight,
    age: row.age,
    basal_metabolic_rate: basalMetabolicRate,
    base_calories: row.base_calories,
    base_protein: row.base_protein,
    base_fat: row.base_fat,
    base_carbs: row.base_carbs,
  });
}

// POST /api/config
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { lean_body_mass, height, weight, age } = body;

  // 除脂肪体重が提供された場合、PFCとベースカロリーを計算
  let base = null;
  if (lean_body_mass && lean_body_mass > 0) {
    base = calculateBase(lean_body_mass);
  }

  // 基礎代謝は身長・体重・年齢から計算
  let basalMetabolicRate = null;
  if (height && height > 0 && weight && weight > 0 && age && age > 0) {
    basalMetabolicRate = Math.round(calculateBasalMetabolicRate(weight, height, age));
  }

  // UPSERT
  const existing = await db.get('SELECT * FROM user_config WHERE id = 1', []);

  if (existing) {
    // 更新: 提供されたフィールドのみ更新
    const updates: string[] = [];
    const values: any[] = [];
    
    if (lean_body_mass !== undefined) {
      updates.push('lean_body_mass = ?');
      values.push(lean_body_mass);
    }
    if (height !== undefined) {
      updates.push('height = ?');
      values.push(height);
    }
    if (weight !== undefined) {
      updates.push('weight = ?');
      values.push(weight);
    }
    if (age !== undefined) {
      updates.push('age = ?');
      values.push(age);
    }
    if (base) {
      updates.push('base_calories = ?', 'base_protein = ?', 'base_fat = ?', 'base_carbs = ?');
      values.push(base.calories, base.protein, base.fat, base.carbs);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(1); // WHERE id = 1
    
    if (updates.length > 1) { // updated_at 以外にも更新がある場合
      await db.execute(`UPDATE user_config SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  } else {
    // 新規挿入
    await db.execute(`
      INSERT INTO user_config (id, lean_body_mass, height, weight, age, base_calories, base_protein, base_fat, base_carbs)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      lean_body_mass || null,
      height || null,
      weight || null,
      age || null,
      base?.calories || null,
      base?.protein || null,
      base?.fat || null,
      base?.carbs || null
    ]);
  }

  return NextResponse.json({
    lean_body_mass: lean_body_mass || null,
    height: height || null,
    weight: weight || null,
    age: age || null,
    basal_metabolic_rate: basalMetabolicRate,
    ...(base || {}),
  });
}