'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface FoodDay {
  date: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
}

interface WeightDay {
  date: string;
  weight_am: number | null;
}

export default function StatsPage() {
  const [days, setDays] = useState(30);
  const [calorieDays, setCalorieDays] = useState<FoodDay[]>([]);
  const [weightDays, setWeightDays] = useState<WeightDay[]>([]);
  const [baseConfig, setBaseConfig] = useState<{
    base_calories: number | null;
    base_protein: number | null;
    base_fat: number | null;
    base_carbs: number | null;
  }>({ base_calories: null, base_protein: null, base_fat: null, base_carbs: null });

  useEffect(() => {
    (async () => {
      const [foodsRes, dailyRes, configRes] = await Promise.all([
        fetch(`/api/foods?days=${days}`),
        fetch(`/api/daily?days=${days}`),
        fetch('/api/config'),
      ]);
      const foodsData = await foodsRes.json();
      const dailyData = await dailyRes.json();
      const configData = await configRes.json();
      setCalorieDays(foodsData.records || []);
      setWeightDays(dailyData.records || []);
      setBaseConfig({
        base_calories: configData.base_calories,
        base_protein: configData.base_protein,
        base_fat: configData.base_fat,
        base_carbs: configData.base_carbs,
      });
    })();
  }, [days]);

  const calDeficit = baseConfig.base_calories
    ? calorieDays.reduce((acc, d) => acc + (d.total_calories - (baseConfig.base_calories || 0)), 0)
    : 0;
  const pDiff = baseConfig.base_protein
    ? calorieDays.reduce((acc, d) => acc + (d.total_protein - (baseConfig.base_protein || 0)), 0)
    : 0;
  const fDiff = baseConfig.base_fat
    ? calorieDays.reduce((acc, d) => acc + (d.total_fat - (baseConfig.base_fat || 0)), 0)
    : 0;
  const cDiff = baseConfig.base_carbs
    ? calorieDays.reduce((acc, d) => acc + (d.total_carbs - (baseConfig.base_carbs || 0)), 0)
    : 0;

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">統計</h1>
        <a href="/" className="text-blue-600 text-sm hover:underline">← ホーム</a>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">集計範囲</h2>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={7}>7日</option>
            <option value={30}>30日</option>
            <option value={90}>90日</option>
          </select>
        </div>
        <div className="mt-2 text-sm text-gray-700">
          <div>
            累計カロリー収支:{' '}
            <span className={`font-bold ${calDeficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {calDeficit > 0 ? '+' : ''}{calDeficit.toFixed(0)}
            </span>{' '}kcal
          </div>
          <div className="mt-1">
            累計PFC差分:
            <span className={`ml-2 ${pDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>P {pDiff >= 0 ? '+' : ''}{pDiff.toFixed(1)}g</span>
            <span className={`ml-2 ${fDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>F {fDiff > 0 ? '+' : ''}{fDiff.toFixed(1)}g</span>
            <span className={`ml-2 ${cDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>C {cDiff > 0 ? '+' : ''}{cDiff.toFixed(1)}g</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-bold mb-2">体重推移</h2>
        {weightDays.length === 0 ? (
          <p className="text-gray-400 text-sm">データ不足</p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={weightDays}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip formatter={(value) => [`${value} kg`, '朝体重']} labelFormatter={(label) => `日付: ${label}`} />
                <Line type="monotone" dataKey="weight_am" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-bold mb-2">カロリー推移</h2>
        {calorieDays.length === 0 ? (
          <p className="text-gray-400 text-sm">データ不足</p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={calorieDays}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 'dataMax + 500']} />
                <Tooltip formatter={(value) => [`${value} kcal`, 'カロリー']} labelFormatter={(label) => `日付: ${label}`} />
                <Line type="monotone" dataKey="total_calories" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
