'use client';

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Label, BarChart, Bar } from 'recharts';
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
  vitamin_a?: number;
  vitamin_c?: number;
  vitamin_d?: number;
  vitamin_e?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b6?: number;
  vitamin_b12?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  magnesium?: number;
  zinc?: number;
  choline?: number;
}

interface Totals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  vitamin_a?: number;
  vitamin_c?: number;
  vitamin_d?: number;
  vitamin_e?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b6?: number;
  vitamin_b12?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  magnesium?: number;
  zinc?: number;
  choline?: number;
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
  total_vitamin_a?: number;
  total_vitamin_c?: number;
  total_vitamin_d?: number;
  total_vitamin_e?: number;
  total_vitamin_b1?: number;
  total_vitamin_b2?: number;
  total_vitamin_b6?: number;
  total_vitamin_b12?: number;
  total_calcium?: number;
  total_iron?: number;
  total_potassium?: number;
  total_magnesium?: number;
  total_zinc?: number;
  total_choline?: number;
}

interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRoom {
  id: number;
  title: string;
  ai_role?: string;
  created_at: string;
  updated_at: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'ai'>('home');
  const [expandedFoodId, setExpandedFoodId] = useState<number | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  // ベースカロリー設定
  const [leanBodyMass, setLeanBodyMass] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [baseConfig, setBaseConfig] = useState<{
    lean_body_mass: number | null;
    height: number | null;
    weight: number | null;
    age: number | null;
    basal_metabolic_rate: number | null;
    base_calories: number | null;
    base_protein: number | null;
    base_fat: number | null;
    base_carbs: number | null;
  }>({
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
  const [sleepHours, setSleepHours] = useState('');
  const [cardioMinutes, setCardioMinutes] = useState('');

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
  const [statsValue, setStatsValue] = useState<number>(30);
  const [statsUnit, setStatsUnit] = useState<'days' | 'months' | 'years'>('days');
  const [isAllPeriod, setIsAllPeriod] = useState(false);
  const [statsCalorieDays, setStatsCalorieDays] = useState<CalorieRecord[]>([]);
  const [statsWeightDays, setStatsWeightDays] = useState<WeightRecord[]>([]);

  // AIチャット（トークルーム対応）
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [aiRole, setAiRole] = useState<string>('kanade');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const roleNames: Record<string, string> = {
    'default': 'デフォルト',
    'kanade': '野増菜かなで',
    'grace': 'グレイス',
    'rasis': 'レイシス',
    'nianoa': 'ニアノア',
    'maxima': 'マキシマ',
    'godo': '合戸孝二',
  };

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
    if (data.lean_body_mass) setLeanBodyMass(String(data.lean_body_mass));
    if (data.height) setHeight(String(data.height));
    if (data.weight) setWeight(String(data.weight));
    if (data.age) setAge(String(data.age));
    setBaseConfig({
      lean_body_mass: data.lean_body_mass,
      height: data.height,
      weight: data.weight,
      age: data.age,
      basal_metabolic_rate: data.basal_metabolic_rate,
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
    setSleepHours(data.sleep_hours !== null && data.sleep_hours !== undefined ? String(data.sleep_hours) : '');
    setCardioMinutes(data.cardio_minutes !== null && data.cardio_minutes !== undefined ? String(data.cardio_minutes) : '');
  };

  const fetchStatsData = async () => {
    setLoading(true);
    try {
      let days: number;
      
      if (isAllPeriod) {
        days = 9999; // 全期間
      } else {
        // 単位に応じて日数に変換
        if (statsUnit === 'days') {
          days = statsValue;
        } else if (statsUnit === 'months') {
          days = statsValue * 30;
        } else { // years
          days = statsValue * 365;
        }
      }
      
      const [foodsRes, dailyRes] = await Promise.all([
        fetch(`/api/foods?days=${days}`),
        fetch(`/api/daily?days=${days}`),
      ]);
      const foodsData = await foodsRes.json();
      const dailyData = await dailyRes.json();
      setStatsCalorieDays(foodsData.records || []);
      setStatsWeightDays(dailyData.records || []);
    } finally {
      setLoading(false);
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
    const loadDateData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchData(), fetchDaily()]);
      } finally {
        setLoading(false);
      }
    };
    loadDateData();
  }, [date]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStatsData();
    }
  }, [activeTab, statsValue, statsUnit, isAllPeriod]);

  useEffect(() => {
    if (activeTab === 'ai') {
      if (currentRoomId) {
        fetchChatMessages(currentRoomId);
      } else if (chatRooms.length > 0) {
        // 最新のトークルームを自動選択
        const latestRoom = chatRooms[0];
        setCurrentRoomId(latestRoom.id);
        // AIロールを復元
        if (latestRoom.ai_role) {
          setAiRole(latestRoom.ai_role);
        }
      }
    }
  }, [activeTab, currentRoomId, chatRooms]);

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
      // 空文字列の場合はnullを送信（データベースから削除）
      await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, weight_am: value.trim() === '' ? null : parseFloat(value) }),
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
        body: JSON.stringify({ date, memo: value || null }),
      });
    }, 500);
  };

  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSleepChange = (value: string) => {
    setSleepHours(value);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(async () => {
      await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, sleep_hours: value ? parseFloat(value) : null }),
      });
    }, 500);
  };

  const cardioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleCardioChange = (value: string) => {
    setCardioMinutes(value);
    if (cardioTimerRef.current) clearTimeout(cardioTimerRef.current);
    cardioTimerRef.current = setTimeout(async () => {
      await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, cardio_minutes: value ? parseFloat(value) : null }),
      });
    }, 500);
  };

  const handleSaveConfig = async () => {
    // 除脂肪体重または身長・体重・年齢のいずれかが入力されている必要がある
    const hasLeanBodyMass = leanBodyMass && parseFloat(leanBodyMass) > 0;
    const hasBodyMetrics = height && weight && age && parseFloat(height) > 0 && parseFloat(weight) > 0 && parseInt(age) > 0;
    
    if (!hasLeanBodyMass && !hasBodyMetrics) return;
    
    setConfigSaving(true);
    try {
      const payload: any = {};
      if (hasLeanBodyMass) payload.lean_body_mass = parseFloat(leanBodyMass);
      if (hasBodyMetrics) {
        payload.height = parseFloat(height);
        payload.weight = parseFloat(weight);
        payload.age = parseInt(age);
      }
      
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const data = await res.json();
        setBaseConfig({
          lean_body_mass: data.lean_body_mass,
          height: data.height,
          weight: data.weight,
          age: data.age,
          basal_metabolic_rate: data.basal_metabolic_rate,
          base_calories: data.base_calories,
          base_protein: data.base_protein,
          base_fat: data.base_fat,
          base_carbs: data.base_carbs,
        });
        setShowConfigModal(false);
        
        // 成功トーストを表示
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } finally {
      setConfigSaving(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchData(), fetchDaily(), fetchWeightHistory(), fetchCalorieHistory()]);
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      await fetch(`/api/foods/${id}`, { method: 'DELETE' });
      await refreshAll();
    } finally {
      setLoading(false);
    }
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
          vitamin_a: food.vitamin_a,
          vitamin_c: food.vitamin_c,
          vitamin_d: food.vitamin_d,
          vitamin_e: food.vitamin_e,
          vitamin_b1: food.vitamin_b1,
          vitamin_b2: food.vitamin_b2,
          vitamin_b6: food.vitamin_b6,
          vitamin_b12: food.vitamin_b12,
          calcium: food.calcium,
          iron: food.iron,
          potassium: food.potassium,
          magnesium: food.magnesium,
          zinc: food.zinc,
          choline: food.choline,
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
    setLoading(true);
    try {
      const res = await fetch('/api/chat-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新しい会話', ai_role: aiRole }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchChatRooms();
        setCurrentRoomId(data.id);
        setChatMessages([]);
        setShowRoomList(false);
        
        // 新規会話開始のアニメーション効果
        setTimeout(() => {
          const inputElement = document.querySelector('input[placeholder*="質問"]') as HTMLInputElement;
          if (inputElement) {
            inputElement.focus();
            inputElement.classList.add('animate-pulse');
            setTimeout(() => inputElement.classList.remove('animate-pulse'), 1000);
          }
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoom = (roomId: number) => {
    setCurrentRoomId(roomId);
    setShowRoomList(false);
    
    // ルームのAIロールを復元
    const room = chatRooms.find((r) => r.id === roomId);
    if (room?.ai_role) {
      setAiRole(room.ai_role);
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('この会話を削除しますか？')) return;
    
    setLoading(true);
    try {
      await fetch(`/api/chat-rooms/${roomId}`, { method: 'DELETE' });
      await fetchChatRooms();
      
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
        setChatMessages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading || !currentRoomId) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    // ユーザーメッセージをDBに保存（タイトル更新も含む）
    await fetch(`/api/chat-rooms/${currentRoomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: userMessage }),
    });

    // UIに即座に反映
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    // ルーム一覧を更新（タイトル更新を反映）- await追加
    await fetchChatRooms();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, date, role: aiRole, roomId: currentRoomId }),
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
      
      // AIメッセージ投稿後もルーム一覧を更新
      await fetchChatRooms();
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

  const currentRoom = chatRooms.find((r) => r.id === currentRoomId);

  // 消費カロリー計算
  const calculateBurnedCalories = () => {
    if (!baseConfig.basal_metabolic_rate) return { basal: 0, cardio: 0, total: 0 };
    
    const basalMetabolicRate = baseConfig.basal_metabolic_rate; // 基礎代謝 (kcal/日)
    
    // 有酸素運動: METs = 6 (中程度の有酸素運動)
    // 簡略化: 基礎代謝ベースで計算
    const cardioHours = cardioMinutes ? parseFloat(cardioMinutes) / 60 : 0;
    const cardio = cardioHours ? (basalMetabolicRate * 6 * cardioHours) / 24 : 0;
    
    return {
      basal: Math.round(basalMetabolicRate),
      cardio: Math.round(cardio),
      total: Math.round(basalMetabolicRate + cardio)
    };
  };

  const burnedCalories = calculateBurnedCalories();
  const netCalories = totals.calories - burnedCalories.total;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/tashiro.ico" alt="アイコン" className="w-8 h-8" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              減量管理
            </h1>
          </div>
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
        <div className="max-w-7xl mx-auto px-4 flex">
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
      <main className="max-w-7xl mx-auto px-4 py-4 pb-20">
        {/* ホームタブ */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左カラム: データ入力 */}
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
                
                {/* 消費カロリー表示 */}
                {burnedCalories.total > 0 && (
                  <div className="mt-2 text-xs opacity-90 space-y-1">
                    <div className="flex justify-center gap-3">
                      {burnedCalories.basal > 0 && (
                        <span>基礎代謝: -{burnedCalories.basal} kcal</span>
                      )}
                      {burnedCalories.cardio > 0 && (
                        <span>有酸素: -{burnedCalories.cardio} kcal</span>
                      )}
                    </div>
                    <div className="font-bold">
                      正味: {netCalories.toFixed(0)} kcal
                    </div>
                  </div>
                )}

                {baseConfig.base_calories !== null && (
                  <div className="text-sm opacity-90 mt-2">
                    メンテナンスカロリー {baseConfig.base_calories} kcal{' '}
                    <span className={netCalories - (baseConfig.base_calories || 0) > 0 ? 'text-yellow-200' : 'text-green-200'}>
                      ({netCalories - (baseConfig.base_calories || 0) > 0 ? '+' : ''}
                      {(netCalories - (baseConfig.base_calories || 0)).toFixed(0)})
                    </span>
                  </div>
                )}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-center gap-4 text-sm">
                    <span>P: <strong>{totals.protein.toFixed(1)}</strong>g</span>
                    <span>F: <strong>{totals.fat.toFixed(1)}</strong>g</span>
                    <span>C: <strong>{totals.carbs.toFixed(1)}</strong>g</span>
                  </div>
                  {baseConfig.base_protein !== null && baseConfig.base_fat !== null && baseConfig.base_carbs !== null && (
                    <div className="flex justify-center gap-2 text-xs opacity-80">
                      <span className={totals.protein - (baseConfig.base_protein || 0) >= 0 ? 'text-green-200' : 'text-red-200'}>
                        ({totals.protein - (baseConfig.base_protein || 0) >= 0 ? '+' : ''}
                        {(totals.protein - (baseConfig.base_protein || 0)).toFixed(1)})
                      </span>
                      <span className={totals.fat - (baseConfig.base_fat || 0) <= 0 ? 'text-green-200' : 'text-yellow-200'}>
                        ({totals.fat - (baseConfig.base_fat || 0) > 0 ? '+' : ''}
                        {(totals.fat - (baseConfig.base_fat || 0)).toFixed(1)})
                      </span>
                      <span className={totals.carbs - (baseConfig.base_carbs || 0) <= 0 ? 'text-green-200' : 'text-yellow-200'}>
                        ({totals.carbs - (baseConfig.base_carbs || 0) > 0 ? '+' : ''}
                        {(totals.carbs - (baseConfig.base_carbs || 0)).toFixed(1)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 体重・睡眠・有酸素 */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">体重・活動</h2>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">体重 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightAm}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="朝の体重"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">睡眠時間 (時間)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => handleSleepChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="例: 7.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">有酸素運動 (分)</label>
                  <input
                    type="number"
                    step="5"
                    value={cardioMinutes}
                    onChange={(e) => handleCardioChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="例: 30"
                  />
                </div>
              </div>
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
                    <ul className="absolute z-50 bottom-full mb-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
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
                            disabled={loading}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            複製
                          </button>
                          <button
                            onClick={() => handleDelete(food.id)}
                            disabled={loading}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>{food.calories}kcal ・ P:{food.protein}g ・ F:{food.fat}g ・ C:{food.carbs}g</div>
                        {(food.vitamin_a || food.vitamin_c || food.calcium || food.iron) && (
                          <button
                            onClick={() => setExpandedFoodId(expandedFoodId === food.id ? null : food.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {expandedFoodId === food.id ? 'ミクロ栄養素を隠す ▲' : 'ミクロ栄養素を表示 ▼'}
                          </button>
                        )}
                        {expandedFoodId === food.id && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
                            {food.vitamin_a ? <div>ビタミンA: {food.vitamin_a.toFixed(1)}μg</div> : null}
                            {food.vitamin_c ? <div>ビタミンC: {food.vitamin_c.toFixed(1)}mg</div> : null}
                            {food.vitamin_d ? <div>ビタミンD: {food.vitamin_d.toFixed(1)}μg</div> : null}
                            {food.vitamin_e ? <div>ビタミンE: {food.vitamin_e.toFixed(1)}mg</div> : null}
                            {food.vitamin_b1 ? <div>ビタミンB1: {food.vitamin_b1.toFixed(2)}mg</div> : null}
                            {food.vitamin_b2 ? <div>ビタミンB2: {food.vitamin_b2.toFixed(2)}mg</div> : null}
                            {food.vitamin_b6 ? <div>ビタミンB6: {food.vitamin_b6.toFixed(2)}mg</div> : null}
                            {food.vitamin_b12 ? <div>ビタミンB12: {food.vitamin_b12.toFixed(1)}μg</div> : null}
                            {food.calcium ? <div>カルシウム: {food.calcium.toFixed(0)}mg</div> : null}
                            {food.iron ? <div>鉄: {food.iron.toFixed(1)}mg</div> : null}
                            {food.potassium ? <div>カリウム: {food.potassium.toFixed(0)}mg</div> : null}
                            {food.magnesium ? <div>マグネシウム: {food.magnesium.toFixed(0)}mg</div> : null}
                            {food.zinc ? <div>亜鉛: {food.zinc.toFixed(1)}mg</div> : null}
                            {food.choline ? <div>コリン: {food.choline.toFixed(0)}mg</div> : null}
                          </div>
                        )}
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

            {/* ミクロ栄養素の横棒グラフ */}
            {(totals.vitamin_a || totals.vitamin_c || totals.calcium || totals.iron || totals.potassium) ? (
              <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
                <h2 className="font-semibold mb-3 text-slate-700">本日のミクロ栄養素</h2>
                <div className="space-y-2">
                  {[
                    { label: 'ビタミンA', value: totals.vitamin_a || 0, unit: 'μg', color: '#f59e0b' },
                    { label: 'ビタミンC', value: totals.vitamin_c || 0, unit: 'mg', color: '#10b981' },
                    { label: 'ビタミンD', value: totals.vitamin_d || 0, unit: 'μg', color: '#3b82f6' },
                    { label: 'ビタミンE', value: totals.vitamin_e || 0, unit: 'mg', color: '#8b5cf6' },
                    { label: 'ビタミンB1', value: totals.vitamin_b1 || 0, unit: 'mg', color: '#ec4899' },
                    { label: 'ビタミンB2', value: totals.vitamin_b2 || 0, unit: 'mg', color: '#f43f5e' },
                    { label: 'ビタミンB6', value: totals.vitamin_b6 || 0, unit: 'mg', color: '#06b6d4' },
                    { label: 'ビタミンB12', value: totals.vitamin_b12 || 0, unit: 'μg', color: '#8b5cf6' },
                    { label: 'カルシウム', value: totals.calcium || 0, unit: 'mg', color: '#64748b' },
                    { label: '鉄', value: totals.iron || 0, unit: 'mg', color: '#ef4444' },
                    { label: 'カリウム', value: totals.potassium || 0, unit: 'mg', color: '#84cc16' },
                    { label: 'マグネシウム', value: totals.magnesium || 0, unit: 'mg', color: '#06b6d4' },
                    { label: '亜鉛', value: totals.zinc || 0, unit: 'mg', color: '#f97316' },
                    { label: 'コリン', value: totals.choline || 0, unit: 'mg', color: '#6366f1' },
                  ].filter(item => item.value > 0).map((item) => {
                    const maxValue = Math.max(...[
                      totals.vitamin_a || 0,
                      totals.vitamin_c || 0,
                      totals.calcium || 0,
                      totals.iron || 0,
                      totals.potassium || 0,
                      totals.magnesium || 0,
                      totals.zinc || 0,
                      totals.choline || 0
                    ]);
                    const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-medium text-slate-800">{item.value.toFixed(1)} {item.unit}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            </div>
            
            {/* 右カラム: グラフとチャート（デスクトップのみ表示） */}
            <div className="hidden lg:block space-y-4">
              {/* 直近7日グラフを右側に表示 */}
              <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
                <h2 className="font-semibold mb-2 text-slate-700 text-sm">直近7日の推移</h2>
                {weightHistory.length > 0 ? (
                  <div className="h-48">
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

              {/* カロリー推移グラフ */}
              <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
                <h2 className="font-semibold mb-2 text-slate-700 text-sm">直近7日カロリー</h2>
                {calorieHistory.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer>
                      <LineChart data={calorieHistory}>
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 9 }} domain={[0, 'dataMax + 500']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="total_calories" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs text-center py-4">データ不足</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 統計タブ */}
        {activeTab === 'stats' && (
          <div className="space-y-4" key={`stats-${statsValue}-${statsUnit}-${isAllPeriod}`}>
            {(() => {
              // 統計タブ内で累計を計算
              const totalCalories = statsCalorieDays.reduce((acc, d) => acc + d.total_calories, 0);
              const totalProtein = statsCalorieDays.reduce((acc, d) => acc + (d.total_protein || 0), 0);
              const totalFat = statsCalorieDays.reduce((acc, d) => acc + (d.total_fat || 0), 0);
              const totalCarbs = statsCalorieDays.reduce((acc, d) => acc + (d.total_carbs || 0), 0);
              
              const numDays = statsCalorieDays.length;
              const maintenanceTotal = numDays * (baseConfig.base_calories || 0);
              const maintenanceProteinTotal = numDays * (baseConfig.base_protein || 0);
              const maintenanceFatTotal = numDays * (baseConfig.base_fat || 0);
              const maintenanceCarbsTotal = numDays * (baseConfig.base_carbs || 0);
              
              const calDeficit = totalCalories - maintenanceTotal;
              const pDiff = totalProtein - maintenanceProteinTotal;
              const fDiff = totalFat - maintenanceFatTotal;
              const cDiff = totalCarbs - maintenanceCarbsTotal;

              return (
                <>
                  <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
                    <div className="mb-4">
                      <h2 className="font-semibold text-slate-700 mb-3">集計範囲</h2>
                      <div className="flex gap-2 items-center mb-2">
                        <input
                          type="number"
                          min="1"
                          value={statsValue}
                          onChange={(e) => setStatsValue(parseInt(e.target.value) || 1)}
                          className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <select
                          value={statsUnit}
                          onChange={(e) => setStatsUnit(e.target.value as 'days' | 'months' | 'years')}
                          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="days">日</option>
                          <option value="months">ヶ月</option>
                          <option value="years">年</option>
                        </select>
                        <button
                          onClick={() => setIsAllPeriod(!isAllPeriod)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isAllPeriod
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          全期間
                        </button>
                      </div>
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
                <div className="h-48" key={`weight-${statsValue}-${statsUnit}-${isAllPeriod}`}>
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

            {/* 睡眠推移グラフ */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">睡眠推移</h2>
              {statsWeightDays.length > 0 ? (
                <div className="h-48" key={`sleep-${statsValue}-${statsUnit}-${isAllPeriod}`}>
                  <ResponsiveContainer>
                    <LineChart data={statsWeightDays}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 'dataMax + 2']} />
                      <Tooltip />
                      <Line type="monotone" dataKey="sleep_hours" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
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
                <div className="h-48" key={`calories-${statsValue}-${statsUnit}-${isAllPeriod}`}>
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

            {/* PFC推移グラフ */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">PFC推移</h2>
              {statsCalorieDays.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-green-600 mb-1">タンパク質 (g)</h3>
                    <div className="h-32" key={`protein-${statsValue}-${statsUnit}-${isAllPeriod}`}>
                      <ResponsiveContainer>
                        <LineChart data={statsCalorieDays}>
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 9 }} domain={[0, 'dataMax + 20']} />
                          <Tooltip />
                          <Line type="monotone" dataKey="total_protein" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-yellow-600 mb-1">脂質 (g)</h3>
                    <div className="h-32" key={`fat-${statsValue}-${statsUnit}-${isAllPeriod}`}>
                      <ResponsiveContainer>
                        <LineChart data={statsCalorieDays}>
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 9 }} domain={[0, 'dataMax + 10']} />
                          <Tooltip />
                          <Line type="monotone" dataKey="total_fat" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-blue-600 mb-1">炭水化物 (g)</h3>
                    <div className="h-32" key={`carbs-${statsValue}-${statsUnit}-${isAllPeriod}`}>
                      <ResponsiveContainer>
                        <LineChart data={statsCalorieDays}>
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 9 }} domain={[0, 'dataMax + 20']} />
                          <Tooltip />
                          <Line type="monotone" dataKey="total_carbs" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">データ不足</p>
              )}
            </div>

            {/* PFC円グラフ */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">PFCバランス</h2>
              {statsCalorieDays.length > 0 ? (
                (() => {
                  const totalP = statsCalorieDays.reduce((acc, d) => acc + (d.total_protein || 0), 0);
                  const totalF = statsCalorieDays.reduce((acc, d) => acc + (d.total_fat || 0), 0);
                  const totalC = statsCalorieDays.reduce((acc, d) => acc + (d.total_carbs || 0), 0);
                  const totalCal = statsCalorieDays.reduce((acc, d) => acc + (d.total_calories || 0), 0);
                  
                  const pieData = [
                    { name: 'タンパク質', value: totalP, color: '#10b981' },
                    { name: '脂質', value: totalF, color: '#f59e0b' },
                    { name: '炭水化物', value: totalC, color: '#3b82f6' },
                  ];

                  return (
                    <div>
                      <div className="h-64" key={`pie-${statsValue}-${statsUnit}-${isAllPeriod}`}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value.toFixed(0)}g`}
                              labelLine={false}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                              <Label
                                value={`${totalCal.toFixed(0)} kcal`}
                                position="center"
                                style={{ fontSize: '20px', fontWeight: 'bold', fill: '#334155' }}
                              />
                            </Pie>
                            <Tooltip formatter={(value) => `${(value as number).toFixed(1)}g`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                        <div>
                          <div className="font-medium text-green-600">P: {totalP.toFixed(1)}g</div>
                        </div>
                        <div>
                          <div className="font-medium text-yellow-600">F: {totalF.toFixed(1)}g</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-600">C: {totalC.toFixed(1)}g</div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">データ不足</p>
              )}
            </div>

            {/* 統計画面のミクロ栄養素集計 */}
            <div className="bg-white/80 backdrop-blur p-4 rounded-xl shadow">
              <h2 className="font-semibold mb-3 text-slate-700">ミクロ栄養素合計</h2>
              {statsCalorieDays.length > 0 ? (
                (() => {
                  const microTotals = {
                    vitamin_a: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_a || 0), 0),
                    vitamin_c: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_c || 0), 0),
                    vitamin_d: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_d || 0), 0),
                    vitamin_e: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_e || 0), 0),
                    vitamin_b1: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_b1 || 0), 0),
                    vitamin_b2: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_b2 || 0), 0),
                    vitamin_b6: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_b6 || 0), 0),
                    vitamin_b12: statsCalorieDays.reduce((acc, d) => acc + (d.total_vitamin_b12 || 0), 0),
                    calcium: statsCalorieDays.reduce((acc, d) => acc + (d.total_calcium || 0), 0),
                    iron: statsCalorieDays.reduce((acc, d) => acc + (d.total_iron || 0), 0),
                    potassium: statsCalorieDays.reduce((acc, d) => acc + (d.total_potassium || 0), 0),
                    magnesium: statsCalorieDays.reduce((acc, d) => acc + (d.total_magnesium || 0), 0),
                    zinc: statsCalorieDays.reduce((acc, d) => acc + (d.total_zinc || 0), 0),
                    choline: statsCalorieDays.reduce((acc, d) => acc + (d.total_choline || 0), 0),
                  };

                  const microData = [
                    { label: 'ビタミンA', value: microTotals.vitamin_a, unit: 'μg', color: '#f59e0b' },
                    { label: 'ビタミンC', value: microTotals.vitamin_c, unit: 'mg', color: '#10b981' },
                    { label: 'ビタミンD', value: microTotals.vitamin_d, unit: 'μg', color: '#3b82f6' },
                    { label: 'ビタミンE', value: microTotals.vitamin_e, unit: 'mg', color: '#8b5cf6' },
                    { label: 'ビタミンB1', value: microTotals.vitamin_b1, unit: 'mg', color: '#ec4899' },
                    { label: 'ビタミンB2', value: microTotals.vitamin_b2, unit: 'mg', color: '#f43f5e' },
                    { label: 'ビタミンB6', value: microTotals.vitamin_b6, unit: 'mg', color: '#06b6d4' },
                    { label: 'ビタミンB12', value: microTotals.vitamin_b12, unit: 'μg', color: '#8b5cf6' },
                    { label: 'カルシウム', value: microTotals.calcium, unit: 'mg', color: '#64748b' },
                    { label: '鉄', value: microTotals.iron, unit: 'mg', color: '#ef4444' },
                    { label: 'カリウム', value: microTotals.potassium, unit: 'mg', color: '#84cc16' },
                    { label: 'マグネシウム', value: microTotals.magnesium, unit: 'mg', color: '#06b6d4' },
                    { label: '亜鉛', value: microTotals.zinc, unit: 'mg', color: '#f97316' },
                    { label: 'コリン', value: microTotals.choline, unit: 'mg', color: '#6366f1' },
                  ].filter(item => item.value > 0);

                  if (microData.length === 0) {
                    return <p className="text-slate-400 text-sm text-center py-8">ミクロ栄養素データなし</p>;
                  }

                  const maxValue = Math.max(...microData.map(item => item.value));

                  return (
                    <div className="space-y-2">
                      {microData.map((item) => {
                        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                        
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">{item.label}</span>
                              <span className="font-medium text-slate-800">{item.value.toFixed(1)} {item.unit}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: item.color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">データ不足</p>
              )}
            </div>
                </>
              );
            })()}
          </div>
        )}

        {/* AIタブ */}
        {activeTab === 'ai' && (
          <div className="h-[calc(100vh-180px)]">
            <div className="bg-white/90 backdrop-blur rounded-xl shadow h-full flex flex-col">
              {/* チャットヘッダー */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="font-semibold text-slate-700">アドバイザー：{roleNames[aiRole]}</h2>
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
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">ロール:</label>
                  <select
                    value={aiRole}
                    onChange={(e) => setAiRole(e.target.value)}
                    disabled={currentRoomId !== null && chatMessages.length > 0}
                    className={`flex-1 text-sm border rounded-lg px-2 py-1 transition-all ${
                      currentRoomId !== null && chatMessages.length > 0
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    }`}
                  >
                    <option value="default">デフォルト</option>
                    <option value="kanade">野増菜かなで</option>
                    <option value="grace">グレイス</option>
                    <option value="rasis">レイシス</option>
                    <option value="nianoa">ニアノア</option>
                    <option value="maxima">マキシマ</option>
                    <option value="godo">合戸孝二</option>
                  </select>
                  {currentRoomId !== null && chatMessages.length > 0 && (
                    <span className="text-xs text-slate-400">（固定）</span>
                  )}
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
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2'}`}
                    >
                      {msg.role === 'assistant' && (
                        <img
                          src={`/${aiRole}.ico`}
                          alt="AI"
                          className="w-8 h-8 rounded-full flex-shrink-0 mt-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/tashiro.ico';
                          }}
                        />
                      )}
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
                    placeholder={currentRoomId ? '質問を入力...' : '「新しい会話」ボタンを押してください'}
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      !currentRoomId ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300'
                    }`}
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">設定</h2>
            
            {/* PFCバランス設定 */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">PFCバランス（目標値）</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">除脂肪体重 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={leanBodyMass}
                    onChange={(e) => setLeanBodyMass(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="66.0"
                  />
                </div>
              </div>
            </div>

            {/* 基礎代謝設定 */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">基礎代謝（消費カロリー計算用）</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">身長 (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="170.0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">体重 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="70.0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">年齢 (歳)</label>
                  <input
                    type="number"
                    step="1"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="30"
                  />
                </div>
              </div>
            </div>

            {/* 計算結果表示 */}
            {(baseConfig.base_calories !== null || baseConfig.basal_metabolic_rate !== null) && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm space-y-2">
                {baseConfig.base_calories !== null && (
                  <div>
                    <div className="text-xs text-slate-600 mb-1">目標カロリー・PFC</div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-slate-800">
                        {baseConfig.base_calories} <span className="text-xs text-slate-500">kcal</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        P: {baseConfig.base_protein}g ・ F: {baseConfig.base_fat}g ・ C: {baseConfig.base_carbs}g
                      </div>
                    </div>
                  </div>
                )}
                {baseConfig.basal_metabolic_rate !== null && (
                  <div>
                    <div className="text-xs text-slate-600 mb-1">基礎代謝</div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {baseConfig.basal_metabolic_rate} <span className="text-xs text-slate-500">kcal/日</span>
                      </div>
                    </div>
                  </div>
                )}
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
                disabled={configSaving || (!leanBodyMass && (!height || !weight || !age))}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg py-2 font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {configSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 成功トースト */}
      {showSuccessToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">設定を保存しました</span>
          </div>
        </div>
      )}
      
      {/* ローディングオーバーレイ */}
      {(loading || configSaving) && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-700 font-medium">処理中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
