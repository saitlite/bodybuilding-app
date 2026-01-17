'use client';

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MarkdownContent from './components/MarkdownContent';

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

interface WeightRecord {
  date: string;
  weight_am: number | null;
}

interface CalorieRecord {
  date: string;
  total_calories: number;
  total_protein?: number;
  total_fat?: number;
  total_carbs?: number;
}

interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRoom {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'ai'>('home');

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
  const [memo, setMemo] = useState('');

  const [foodName, setFoodName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const [loading, setLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // サジェスト
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 統計用
  const [statsDays, setStatsDays] = useState<number | 'all'>(30);
  const [statsCalorieDays, setStatsCalorieDays] = useState<CalorieRecord[]>([]);
  const [statsWeightDays, setStatsWeightDays] = useState<WeightRecord[]>([]);

  // AIチャット（トークルーム対応）
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const units = ['g', 'kg', 'ml', 'L', '個', '本', '杯', '皿', '袋', '枚', '貫'];

  const fetchWeightHistory = async () => {
    const res = await fetch('/api/daily?days=7');
    if (!res.ok) return;
    const data = await res.json();
    setWeightHistory(data.records || []);
  };

  const fetchCalorieHistory = async () => {
    const res = await fetch('/api/foods?days=7');
    if (!res.ok) return;
    const data = await res.json();
    setCalorieHistory(data.records || []);
  };

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

  const fetchData = async () => {
    const res = await fetch(`/api/foods?date=${date}`);
    const data = await res.json();
    setFoods(data.foods);
    setTotals(data.totals);
  };

  const fetchDaily = async () => {
    const res = await fetch(`/api/daily?date=${date}`);
    const data = await res.json();
    setWeightAm(data.weight_am !== null && data.weight_am !== undefined ? String(data.weight_am) : '');
    setMemo(data.memo || '');
  };

  const fetchStatsData = async () => {
    if (statsDays === 'all') {
      const [foodsRes, dailyRes] = await Promise.all([
        fetch(`/api/foods?days=9999`),
        fetch(`/api/daily?days=9999`),
      ]);
      const foodsData = await foodsRes.json();
      const dailyData = await dailyRes.json();
      setStatsCalorieDays(foodsData.records || []);
      setStatsWeightDays(dailyData.records || []);
    } else {
      const [foodsRes, dailyRes] = await Promise.all([
        fetch(`/api/foods?days=${statsDays}`),
        fetch(`/api/daily?days=${statsDays}`),
      ]);
      const foodsData = await foodsRes.json();
      const dailyData = await dailyRes.json();
      setStatsCalorieDays(foodsData.records || []);
      setStatsWeightDays(dailyData.records || []);
    }
  };

  const fetchChatRooms = async () => {
    const res = await fetch('/api/chat-rooms');
    if (!res.ok) return;
    const data = await res.json();
    setChatRooms(data.rooms || []);
  };

  const fetchChatMessages = async (roomId: number) => {
    const res = await fetch(`/api/chat-rooms/${roomId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setChatMessages(data.messages || []);
  };

  useEffect(() => {
    fetchWeightHistory();
    fetchCalorieHistory();
    fetchConfig();
    fetchChatRooms();
  }, []);

  useEffect(() => {
    fetchData();
    fetchDaily();
  }, [date]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStatsData();
    }
  }, [activeTab, statsDays]);

  useEffect(() => {
    if (activeTab === 'ai' && currentRoomId) {
      fetchChatMessages(currentRoomId);
    }
  }, [activeTab, currentRoomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
      setSuggestions([]);
      setShowSuggestions(false);

      await fetchData();
      await fetchCalorieHistory();
    } catch (error) {
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const weightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const memoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleWeightChange = (value: string) => {
    setWeightAm(value);
    if (weightTimerRef.current) clearTimeout(weightTimerRef.current);
    weightTimerRef.current = setTimeout(async () => {
      if (!value) return;
      await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, weight_am: parseFloat(value) }),
      });
      fetchWeightHistory();
    }, 500);
  };

  const handleMemoChange = (value: string) => {
    setMemo(value);
    if (memoTimerRef.current) clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(async () => {
      await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, memo: value }),
      });
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
      setShowConfigModal(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchData(), fetchDaily(), fetchWeightHistory(), fetchCalorieHistory()]);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/foods/${id}`, { method: 'DELETE' });
    refreshAll();
  };

  const handleDuplicate = async (food: Food) => {
    setLoading(true);
    try {
      await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          food_name: food.food_name,
          amount: food.amount,
          unit: food.unit,
          calories: food.calories,
          protein: food.protein,
          fat: food.fat,
          carbs: food.carbs,
          score: food.score,
        }),
      });
      await refreshAll();
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleFoodNameInputChange = (value: string) => {
    setFoodName(value);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/suggest?q=${encodeURIComponent(value)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch {
        // ignore
      }
    }, 200);
  };

  const handleNewChatRoom = async () => {
    const res = await fetch('/api/chat-rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新しい会話' }),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchChatRooms();
      setCurrentRoomId(data.id);
      setChatMessages([]);
      setShowRoomList(false);
    }
  };

  const handleSelectRoom = (roomId: number) => {
    setCurrentRoomId(roomId);
    setShowRoomList(false);
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('この会話を削除しますか？')) return;
    
    await fetch(`/api/chat-rooms/${roomId}`, { method: 'DELETE' });
    await fetchChatRooms();
    
    if (currentRoomId === roomId) {
      setCurrentRoomId(null);
      setChatMessages([]);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading || !currentRoomId) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    // ユーザーメッセージをDBに保存
    await fetch(`/api/chat-rooms/${currentRoomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: userMessage }),
    });

    // UIに即座に反映
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    // ルーム一覧を更新（タイトル更新のため）
    await fetchChatRooms();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, date }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Chat API Error:', errorData);
        const errorMsg = `エラー: ${errorData.error || 'APIエラーが発生しました'}`;
        
        await fetch(`/api/chat-rooms/${currentRoomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: errorMsg }),
        });
        
        setChatMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
        return;
      }

      const data = await res.json();
      const aiMessage = data.message || 'エラーが発生しました';
      
      // AIメッセージをDBに保存
      await fetch(`/api/chat-rooms/${currentRoomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: aiMessage }),
      });
      
      setChatMessages((prev) => [...prev, { role: 'assistant', content: aiMessage }]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMsg = `通信エラー: ${error instanceof Error ? error.message : '不明なエラー'}`;
      
      await fetch(`/api/chat-rooms/${currentRoomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: errorMsg }),
      });
      
      setChatMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setChatLoading(false);
    }
  };

  const calDeficit = baseConfig.base_calories
    ? statsCalorieDays.reduce((acc, d) => acc + (d.total_calories - (baseConfig.base_calories || 0)), 0)
    : 0;
  const pDiff = baseConfig.base_protein
    ? statsCalorieDays.reduce((acc, d) => acc + ((d.total_protein || 0) - (baseConfig.base_protein || 0)), 0)
    : 0;
  const fDiff = baseConfig.base_fat
    ? statsCalorieDays.reduce((acc, d) => acc + ((d.total_fat || 0) - (baseConfig.base_fat || 0)), 0)
    : 0;
  const cDiff = baseConfig.base_carbs
    ? statsCalorieDays.reduce((acc, d) => acc + ((d.total_carbs || 0) - (baseConfig.base_carbs || 0)), 0)
    : 0;

  const currentRoom = chatRooms.find((r) => r.id === currentRoomId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            減量管理
          </h1>
          <button
            onClick={() => setShowConfigModal(true)}
            className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
          >
            設定
          </button>
        </div>
      </header>

      {/* タブナビゲーション */}
      <nav className="sticky top-[57px] z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 flex">
          {(['home', 'stats', 'ai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'home' && 'ホーム'}
              {tab === 'stats' && '統計'}
              {tab === 'ai' && 'AIアドバイス'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-md mx-auto px-4 py-4 pb-20">
        {/* ホームタブ */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* 日付選択 */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => changeDate(-1)}
                className="px-4 py-2 bg-white/80 backdrop-blur rounded-lg shadow hover:shadow-md transition-all hover:bg-white font-medium text-slate-700"
              >
                前日
              </button>
              {showDatePicker ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onBlur={() => setShowDatePicker(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setShowDatePicker(false);
                  }}
                  className="border rounded-lg px-3 py-2 text-sm shadow-sm"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setShowDatePicker(true)}
                  className="font-mono text-base font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  {date}
                </button>
              )}
              <button
                onClick={() => changeDate(1)}
                className="px-4 py-2 bg-white/80 backdrop-blur rounded-lg shadow hover:shadow-md transition-all hover:bg-white font-medium text-slate-700"
              >
                翌日
              </button>
            </div>

            {/* 本日合計（目立つカード） */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
              <h2 className="text-sm font-medium opacity-90 mb-2">本日合計</h2>
              <div className="text-center">
                <div className="text-5xl font-extrabold tracking-tight mb-1">
                  {totals.calories.toFixed(0)}
                  <span className="text-lg font-normal ml-1 opacity-80">kcal</span>
                </div>
                {baseConfig.base_calories !== null && (
                  <div className="text-sm opacity-90">
                    目標 {baseConfig.base_calories} kcal{' '}
                    <span className={totals.calories - (baseConfig.base_calories || 0) > 0 ? 'text-yellow-200' : 'text-green-200'}>
                      ({totals.calories - (baseConfig.base_calories || 0) > 0 ? '+' : ''}
                      {(totals.calories - (baseConfig.base_calories || 0)).toFixed(0)})
                    </span>
                  </div>
                )}
                <div className="mt-3 flex justify-center gap-4 text-sm">
                  <span>P: <strong>{totals.protein.toFixed(1)}</strong>g</span>
                  <span>F: <strong>{totals.fat.toFixed(1)}</strong>g</span>
                  <span>C: <strong>{totals.carbs.toFixed(1)}</strong>g</span>
                </div>
              </div>
            </div>

            {/* 体重 */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-2 text-slate-700">体重</h2>
              <input
                type="number"
                step="0.1"
                value={weightAm}
                onChange={(e) => handleWeightChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="朝の体重 (kg)"
              />
            </div>

            {/* メモ */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-2 text-slate-700">メモ</h2>
              <textarea
                value={memo}
                onChange={(e) => handleMemoChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="一言メモ（自動保存）"
                rows={2}
              />
            </div>

            {/* 食事入力 */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">食事入力</h2>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="食材名"
                    value={foodName}
                    onChange={(e) => handleFoodNameInputChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {suggestions.map((s) => (
                        <li
                          key={s}
                          onMouseDown={() => {
                            setFoodName(s);
                            setShowSuggestions(false);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors text-sm"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="数量"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg py-2.5 font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '取得中...' : '取得して追加'}
                </button>
              </div>
            </div>

            {/* 食事一覧 */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">本日の食事</h2>
              {foods.length === 0 ? (
                <p className="text-slate-400 text-center py-6 text-sm">まだ記録がありません</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {foods.map((food) => (
                    <div
                      key={food.id}
                      className="border border-slate-200 rounded-lg p-3 bg-white/50 hover:bg-white transition-all"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-slate-800">
                          {food.food_name} {food.amount}
                          {food.unit}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDuplicate(food)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
                          >
                            複製
                          </button>
                          <button
                            onClick={() => handleDelete(food.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600">
                        {food.calories}kcal ・ P:{food.protein}g ・ F:{food.fat}g ・ C:{food.carbs}g
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* グラフ（簡易版） */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-2 text-slate-700 text-sm">直近7日の推移</h2>
              {weightHistory.length > 0 ? (
                <div className="h-32">
                  <ResponsiveContainer>
                    <LineChart data={weightHistory}>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 9 }} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight_am" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-xs text-center py-4">データ不足</p>
              )}
            </div>
          </div>
        )}

        {/* 統計タブ */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-700">集計範囲</h2>
                <select
                  value={statsDays}
                  onChange={(e) => setStatsDays(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value={7}>7日</option>
                  <option value={30}>30日</option>
                  <option value={90}>90日</option>
                  <option value={180}>半年</option>
                  <option value={365}>1年</option>
                  <option value="all">全ての期間</option>
                </select>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  累計カロリー収支:{' '}
                  <span className={`font-bold ${calDeficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {calDeficit > 0 ? '+' : ''}{calDeficit.toFixed(0)}
                  </span>{' '}
                  kcal
                </div>
                <div className="text-xs">
                  PFC差分:{' '}
                  <span className={pDiff >= 0 ? 'text-green-600' : 'text-red-600'}>P {pDiff >= 0 ? '+' : ''}{pDiff.toFixed(1)}g</span>
                  {' '}・{' '}
                  <span className={fDiff > 0 ? 'text-red-600' : 'text-green-600'}>F {fDiff > 0 ? '+' : ''}{fDiff.toFixed(1)}g</span>
                  {' '}・{' '}
                  <span className={cDiff > 0 ? 'text-red-600' : 'text-green-600'}>C {cDiff > 0 ? '+' : ''}{cDiff.toFixed(1)}g</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">体重推移</h2>
              {statsWeightDays.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer>
                    <LineChart data={statsWeightDays}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight_am" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">データ不足</p>
              )}
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">カロリー推移</h2>
              {statsCalorieDays.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer>
                    <LineChart data={statsCalorieDays}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 'dataMax + 500']} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total_calories" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">データ不足</p>
              )}
            </div>
          </div>
        )}

        {/* AIタブ */}
        {activeTab === 'ai' && (
          <div className="h-[calc(100vh-180px)]">
            <div className="bg-white/90 backdrop-blur rounded-xl shadow h-full flex flex-col">
              {/* チャットヘッダー */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-700">AIアドバイザー</h2>
                  {currentRoom && (
                    <p className="text-xs text-slate-500">{currentRoom.title}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRoomList(!showRoomList)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    会話履歴
                  </button>
                  <button
                    onClick={handleNewChatRoom}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    新しい会話
                  </button>
                </div>
              </div>

              {/* ルームリスト */}
              {showRoomList && (
                <div className="border-b border-slate-200 bg-slate-50 max-h-48 overflow-y-auto">
                  {chatRooms.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">会話履歴がありません</p>
                  ) : (
                   <div className="divide-y divide-slate-200">
                     {chatRooms.map((room) => (
                       <div
                         key={room.id}
                         className={`flex items-center justify-between px-4 py-3 hover:bg-white transition-colors ${
                           currentRoomId === room.id ? 'bg-blue-50' : ''
                         }`}
                       >
                         <button
                           onClick={() => handleSelectRoom(room.id)}
                           className="flex-1 text-left"
                         >
                           <div className="text-sm font-medium text-slate-800">{room.title}</div>
                           <div className="text-xs text-slate-500">{new Date(room.updated_at).toLocaleString('ja-JP')}</div>
                         </button>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeleteRoom(room.id);
                           }}
                           className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium ml-2"
                         >
                           削除
                         </button>
                       </div>
                     ))}
                   </div>
                  )}
                </div>
              )}

              {/* メッセージ表示エリア */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!currentRoomId ? (
                  <div className="text-center text-slate-400 text-sm py-12">
                    「新しい会話」ボタンで会話を開始してください
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-12">
                    メッセージを入力してください
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownContent content={msg.content} />
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* 入力エリア */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSend();
                      }
                    }}
                    placeholder={currentRoomId ? '質問を入力...' : '先に会話を作成してください'}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={chatLoading || !currentRoomId}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={chatLoading || !chatInput.trim() || !currentRoomId}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chatLoading ? '...' : '送信'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 設定モーダル */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold mb-4">ベースカロリー設定</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">除脂肪体重 (kg)</label>
              <input
                type="number"
                step="0.1"
                value={leanBodyMass}
                onChange={(e) => setLeanBodyMass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="66.0"
              />
            </div>
            {baseConfig.base_calories !== null && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {baseConfig.base_calories} <span className="text-sm text-slate-500">kcal</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    P: {baseConfig.base_protein}g ・ F: {baseConfig.base_fat}g ・ C: {baseConfig.base_carbs}g
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 bg-slate-200 text-slate-700 rounded-lg py-2 font-medium hover:bg-slate-300 transition-all"
              >
                閉じる
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!leanBodyMass}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg py-2 font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                計算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
