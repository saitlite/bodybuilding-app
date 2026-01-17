const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// データベース接続
const db = new Database(path.join(__dirname, '../database.sqlite'));

// 数値を抽出する関数（"168.0kcal" → 168.0, "1,344.0kcal" → 1344.0）
function extractNumber(str) {
  if (!str || str.trim() === '') return null;
  // カンマを削除してから数値を抽出
  const match = str.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// CSVファイルを読み込み
const csvPath = path.join(__dirname, '../雑 - 食材.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// ヘッダー行をスキップ
const dataLines = lines.slice(1).filter(line => line.trim());

console.log(`読み込み行数: ${dataLines.length}`);

// 既存データを削除
console.log('既存データを削除中...');
db.prepare('DELETE FROM food_logs').run();
db.prepare('DELETE FROM daily_records').run();
console.log('削除完了');

// データ挿入準備
const insertFoodStmt = db.prepare(`
  INSERT INTO food_logs (
    date, food_name, amount, unit, calories, protein, fat, carbs, score
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertDailyStmt = db.prepare(`
  INSERT OR REPLACE INTO daily_records (
    date, memo
  ) VALUES (?, ?)
`);

let successCount = 0;
let skipCount = 0;
let memosByDate = {}; // 日付ごとの備考を収集

// CSVパースとインサート
for (const line of dataLines) {
  // CSVの各フィールドを分割（カンマで区切られているが、値の中にもカンマがある可能性を考慮）
  const fields = line.split(',');
  
  if (fields.length < 11) {
    skipCount++;
    continue;
  }
  
  const date = fields[0].trim();
  const foodName = fields[1].trim();
  const amount = extractNumber(fields[2]);
  const unit = fields[3].trim();
  const scriptKick = fields[4].trim();
  const calories = extractNumber(fields[5]);
  const protein = extractNumber(fields[6]);
  const fat = extractNumber(fields[7]);
  const carbs = extractNumber(fields[8]);
  const scoreStr = fields[9].trim();
  const memo = fields[10] ? fields[10].trim() : '';
  
  // 日付フォーマット確認（YYYY-MM-DD）
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    skipCount++;
    continue;
  }
  
  // 食材名が空の場合はスキップ
  if (!foodName) {
    skipCount++;
    continue;
  }
  
  // 数量が空の場合はスキップ
  if (!amount) {
    skipCount++;
    continue;
  }
  
  // カロリーが空の場合はスキップ
  if (!calories) {
    skipCount++;
    continue;
  }
  
  // スコアを抽出（"65点" → 65）
  const score = scoreStr ? extractNumber(scoreStr) : null;
  
  // 備考を日付ごとに収集
  if (memo) {
    if (!memosByDate[date]) {
      memosByDate[date] = [];
    }
    memosByDate[date].push(`${foodName}: ${memo}`);
  }
  
  try {
    insertFoodStmt.run(
      date,
      foodName,
      amount,
      unit || 'g',
      calories || 0,
      protein || 0,
      fat || 0,
      carbs || 0,
      score || 0
    );
    successCount++;
  } catch (error) {
    console.error(`エラー: ${date} - ${foodName}`, error.message);
    skipCount++;
  }
}

// 日付ごとの備考をdaily_recordsに保存
console.log('\n備考データを保存中...');
let memoCount = 0;
for (const [date, memos] of Object.entries(memosByDate)) {
  const combinedMemo = memos.join('\n');
  try {
    insertDailyStmt.run(date, combinedMemo);
    memoCount++;
  } catch (error) {
    console.error(`メモ保存エラー: ${date}`, error.message);
  }
}

console.log(`\n完了！`);
console.log(`食事記録: ${successCount}件`);
console.log(`メモ保存: ${memoCount}日分`);
console.log(`スキップ: ${skipCount}件`);

// 挿入されたデータの統計
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    MIN(date) as min_date,
    MAX(date) as max_date,
    SUM(calories) as total_calories
  FROM food_logs
`).get();

console.log(`\nデータ統計:`);
console.log(`総レコード数: ${stats.total}`);
console.log(`最古の日付: ${stats.min_date}`);
console.log(`最新の日付: ${stats.max_date}`);
console.log(`総カロリー: ${stats.total_calories.toFixed(0)} kcal`);

db.close();
