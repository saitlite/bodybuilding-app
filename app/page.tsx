'use client';

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Food {
  id: number;
  food_name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  score: number;
}

interface Totals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export default function Home() {

  interface WeightRecord {
  date: string;
  weight_am: number | null;
  
}

interface CalorieRecord {
  date: string;
  total_calories: number;
}

// ベースカロリー設定
const [leanBodyMass, setLeanBodyMass] = useState('');
const [baseConfig, setBaseConfig] = useState<{
  base_calories: number | null;
  base_protein: number | null;
  base_fat: number | null;
  base_carbs: number | null;
}>({
  base_calories: null,
  base_protein: null,
  base_fat: null,
  base_carbs: null,
});

const [calorieHistory, setCalorieHistory] = useState<CalorieRecord[]>([]);
const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [totals, setTotals] = useState<Totals>({
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  });
  const [weightAm, setWeightAm] = useState('');

  const [foodName, setFoodName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const [loading, setLoading] = useState(false);

  const units = ['g', 'kg', 'ml', 'L', '個', '本', '杯', '皿', '袋', '枚', '貫'];

const fetchWeightHistory = async () => {
  const res = await fetch('/api/daily?days=7');
  if (!res.ok) return;
  const data = await res.json();
  setWeightHistory(data.records || []);
};  // ← ここで閉じる！

const fetchCalorieHistory = async () => {
  const res = await fetch('/api/foods?days=7');
  if (!res.ok) return;
  const data = await res.json();
  setCalorieHistory(data.records || []);
};  // ← ここで閉じる！

const fetchConfig = async () => {
  const res = await fetch('/api/config');
  if (!res.ok) return;
  const data = await res.json();
  if (data.lean_body_mass) {
    setLeanBodyMass(String(data.lean_body_mass));
  }
  setBaseConfig({
    base_calories: data.base_calories,
    base_protein: data.base_protein,
    base_fat: data.base_fat,
    base_carbs: data.base_carbs,
  });
};


  // データ取得
  const fetchData = async () => {
    const res = await fetch(`/api/foods?date=${date}`);
    const data = await res.json();
    setFoods(data.foods);
    setTotals(data.totals);
  };

  // 体重の取得
const fetchDaily = async () => {
  const res = await fetch(`/api/daily?date=${date}`);
  const data = await res.json();
  setWeightAm(data.weight_am !== null && data.weight_am !== undefined ? String(data.weight_am) : '');
};

useEffect(() => {
  fetchWeightHistory();
  fetchCalorieHistory();
  fetchConfig();
}, []);

  useEffect(() => {
    fetchData();
    fetchDaily();
  }, [date]);

const handleAddFood = async () => {
  if (!foodName || !amount) return;

  setLoading(true);
  try {
    const nutritionRes = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_name: foodName,
        amount: parseFloat(amount),
        unit,
      }),
    });
    const nutrition = await nutritionRes.json();

    await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        food_name: foodName,
        amount: parseFloat(amount),
        unit,
        ...nutrition,
      }),
    });

    setFoodName('');
    setAmount('');

    // ここで再取得（これがあれば合計も更新される）
    await fetchData();
    await fetchCalorieHistory(); // カロリーグラフ用があれば

  } catch (error) {
    alert('エラーが発生しました');
  } finally {
    setLoading(false);
  }
};
  // 体重入力のdebounce用
const weightTimerRef = useRef<NodeJS.Timeout | null>(null);

const handleWeightChange = (value: string) => {
  setWeightAm(value);

  // 前のタイマーをクリア
  if (weightTimerRef.current) {
    clearTimeout(weightTimerRef.current);
  }

  // 500ms後に保存
  weightTimerRef.current = setTimeout(async () => {
    if (!value) return;

    await fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        weight_am: parseFloat(value),
      }),
    });

    fetchWeightHistory();
  }, 500);
};

  const handleSaveConfig = async () => {
  if (!leanBodyMass) return;

  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lean_body_mass: parseFloat(leanBodyMass) }),
  });

  if (res.ok) {
    const data = await res.json();
    setBaseConfig({
      base_calories: data.base_calories,
      base_protein: data.base_protein,
      base_fat: data.base_fat,
      base_carbs: data.base_carbs,
    });
  }
};

//全体の関数を呼ぶ関数
const refreshAll = async () => {
  await Promise.all([
    fetchData(),
    fetchDaily(),
    fetchWeightHistory(),
    fetchCalorieHistory(), // あれば
  ]);
};

  // 削除
  const handleDelete = async (id: number) => {
    await fetch(`/api/foods/${id}`, { method: 'DELETE' });
    refreshAll();
  };

  // 日付変更
  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold text-center mb-4"> 減量管理</h1>

      {/* 日付選択 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => changeDate(-1)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ◀
        </button>
        <span className="font-mono text-lg">{date}</span>
        <button
          onClick={() => changeDate(1)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ▶
        </button>
      </div>

{/* 体重入力 */}
<div className="bg-white p-4 rounded-lg shadow mb-4">
  <h2 className="font-bold mb-2">体重</h2>
  <div className="flex gap-4">
    <label className="flex items-center gap-2">
      朝:
      <input
        type="number"
        step="0.1"
        value={weightAm}
        onChange={(e) => handleWeightChange(e.target.value)}
        className="w-20 border rounded px-2 py-1"
        placeholder="00.0"
      />
      kg
    </label>
  </div>
</div>

      {/* 食事入力 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-bold mb-2">食事入力</h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="食材名（例: スシロー）"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="数量"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddFood}
            disabled={loading || !foodName || !amount}
            className="w-full bg-blue-500 text-white rounded py-2 hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? '🔄 取得中...' : '🤖 AI取得して追加'}
          </button>
        </div>
      </div>

      {/* 食材一覧 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-bold mb-2">本日の食事</h2>
        {foods.length === 0 ? (
          <p className="text-gray-400 text-center py-4">まだ記録がありません</p>
        ) : (
          <div className="space-y-2">
            {foods.map((food) => (
              <div
                key={food.id}
                className="border-b pb-2 flex justify-between items-start"
              >
                <div>
                  <div className="font-medium">
                    {food.food_name} {food.amount}
                    {food.unit}
                  </div>
                  <div className="text-sm text-gray-600">
                    Cal:{food.calories} P:{food.protein} F:{food.fat} C:
                    {food.carbs}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(food.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

{/* 合計 + 過不足 */}
<div className="bg-blue-50 p-4 rounded-lg shadow mb-4">
  <h2 className="font-bold mb-2">本日合計</h2>
  <div className="grid grid-cols-2 gap-2 text-sm">
    <div>
      カロリー:{' '}
      <span className="font-bold">{totals.calories.toFixed(0)}</span> kcal
      {baseConfig.base_calories && (
        <span className={`ml-1 ${totals.calories - baseConfig.base_calories > 0 ? 'text-red-500' : 'text-green-600'}`}>
          ({totals.calories - baseConfig.base_calories > 0 ? '+' : ''}{(totals.calories - baseConfig.base_calories).toFixed(0)})
        </span>
      )}
    </div>
    <div>
      P:{' '}
      <span className="font-bold">{totals.protein.toFixed(1)}</span> g
      {baseConfig.base_protein && (
        <span className={`ml-1 ${totals.protein - baseConfig.base_protein > 0 ? 'text-green-600' : 'text-red-500'}`}>
          ({totals.protein - baseConfig.base_protein > 0 ? '+' : ''}{(totals.protein - baseConfig.base_protein).toFixed(1)})
        </span>
      )}
    </div>
    <div>
      F:{' '}
      <span className="font-bold">{totals.fat.toFixed(1)}</span> g
      {baseConfig.base_fat && (
        <span className={`ml-1 ${totals.fat - baseConfig.base_fat > 0 ? 'text-red-500' : 'text-green-600'}`}>
          ({totals.fat - baseConfig.base_fat > 0 ? '+' : ''}{(totals.fat - baseConfig.base_fat).toFixed(1)})
        </span>
      )}
    </div>
    <div>
      C:{' '}
      <span className="font-bold">{totals.carbs.toFixed(1)}</span> g
      {baseConfig.base_carbs && (
        <span className={`ml-1 ${totals.carbs - baseConfig.base_carbs > 0 ? 'text-red-500' : 'text-green-600'}`}>
          ({totals.carbs - baseConfig.base_carbs > 0 ? '+' : ''}{(totals.carbs - baseConfig.base_carbs).toFixed(1)})
        </span>
      )}
    </div>
  </div>
</div>
      {/* 体重推移グラフ */}
<div className="bg-white p-4 rounded-lg shadow">
  <h2 className="font-bold mb-2">直近7日間の体重推移（朝）</h2>
  {weightHistory.length === 0 ? (
    <p className="text-gray-400 text-sm">まだ体重データが十分にありません</p>
  ) : (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <LineChart data={weightHistory}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => v.slice(5)} // "2026-01-15" → "01-15"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={['dataMin - 1', 'dataMax + 1']}
          />
          <Tooltip
            formatter={(value) => [`${value} kg`, '朝体重']}
            labelFormatter={(label) => `日付: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="weight_am"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

    
  )}
</div>

{/* カロリー推移グラフ */}
<div className="bg-white p-4 rounded-lg shadow mt-4">
  <h2 className="font-bold mb-2">直近7日間のカロリー推移</h2>
  {calorieHistory.length === 0 ? (
    <p className="text-gray-400 text-sm">まだ食事データが十分にありません</p>
  ) : (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <LineChart data={calorieHistory}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={[0, 'dataMax + 500']}
          />
          <Tooltip
            formatter={(value) => [`${value} kcal`, 'カロリー']}
            labelFormatter={(label) => `日付: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="total_calories"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )}
</div>  

{/* ベースカロリー設定 */}
<div className="bg-white p-4 rounded-lg shadow mb-4">
  <h2 className="font-bold mb-2">ベースカロリー設定</h2>
  <div className="flex gap-2 items-center mb-3">
    <label className="text-sm">除脂肪体重:</label>
    <input
      type="number"
      step="0.1"
      value={leanBodyMass}
      onChange={(e) => setLeanBodyMass(e.target.value)}
      className="w-20 border rounded px-2 py-1"
      placeholder="66.0"
    />
    <span className="text-sm">kg</span>
    <button
      onClick={handleSaveConfig}
      disabled={!leanBodyMass}
      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
    >
      計算
    </button>
  </div>

  {baseConfig.base_calories && (
    <div className="bg-gray-50 p-2 rounded text-sm">
      <div className="grid grid-cols-2 gap-1">
        <div>目標カロリー: <span className="font-bold">{baseConfig.base_calories}</span> kcal</div>
        <div>目標P: <span className="font-bold">{baseConfig.base_protein}</span> g</div>
        <div>目標F: <span className="font-bold">{baseConfig.base_fat}</span> g</div>
        <div>目標C: <span className="font-bold">{baseConfig.base_carbs}</span> g</div>
      </div>
    </div>
  )}
</div>



    </div>
  );
}