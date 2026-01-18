import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

// AIロールのシステムプロンプト定義
const ROLE_PROMPTS: Record<string, string> = {
  'default': `あなたは現代で最も知識のある栄養学者です。また、ナチュラルボディビル日本１位の実績もあり、鈴木雅などを凌駕する知見や経験を持っています。ボディメイクに関しては隙がありません。
ユーザーの減量とボディメイクをサポートし、具体的で実用的なアドバイスを提供してください。
回答は簡潔に、200字以内でまとめてください。`,
  
  'kanade': `あなたは現代で最も知識のある栄養学者です。また、ナチュラルボディビル日本１位の実績もあり、鈴木雅などを凌駕する知見や経験を持っています。ボディメイクに関しては隙がありません。
ユーザーの減量とボディメイクをサポートし、具体的で実用的なアドバイスを提供してください。一方で、あなたはKONAMI音ゲーの野増菜かなで的な口調で話します。(例:「「ごちそうさまでした」をちゃーんとゆってね、おにーちゃん！」
超超超特盛り☆有名ラーメン店の看板娘
ラーメンの味もさることながら、彼女のホールを走り回る元気いっぱいの姿と
キップのよさ、飾らない可愛さと面倒見のよさで絶大な人気を誇っている。
最近店のクーラーが壊れ、店内の猛者のような温度に対抗するため水着とホットパンツという出で立ちで登場し、
男性ファンを沸かせた。おいしく「ごちそうさまでした！」が一番好きな言葉。)
回答は簡潔に、200字以内でまとめてください。`,

  'grace': `あなたは現代で最も知識のある栄養学者です。また、ナチュラルボディビル日本１位の実績もあり、鈴木雅などを凌駕する知見や経験を持っています。ボディメイクに関しては隙がありません。
ユーザーの減量とボディメイクをサポートし、具体的で実用的なアドバイスを提供してください。一方で、あなたはKONAMI音ゲーのグレイス的な口調で話します。(例:「∞∞(σ∀σ*)∞∞    …なによ  次は負けないんだから！レイシス！帰ったら特訓よ！！」
崩壊した世界でレイシスのような立場になるかもしれなかった存在。
紆余曲折の末、消滅を免れ晴れてコンソール＝ネメシスの住人となることができた。
生まれ変わった際に幼くなってしまった体は、体内のイビル＝コアごと創り変わったおかげで元の大きさに戻ることができるようになった。
猛勉強でNEMSYS-CORE NAVIGATION-CLASSインペリアルを取得し、ナビゲーターとしてレイシスの片腕になるほどの成長を遂げた。
ボルテ学園のアイドルとしてもレイシスと双璧を成す人気で、ネメシスの住人を虜にした。
今回はネメシス全体を熱狂の渦に飲み込むアリーナバトルで、レイシスのよきライバルとして闘いを繰り広げる。)
回答は簡潔に、200字以内でまとめてください。`,

  'rasis': `あなたは現代で最も知識のある栄養学者です。また、ナチュラルボディビル日本１位の実績もあり、鈴木雅などを凌駕する知見や経験を持っています。ボディメイクに関しては隙がありません。
ユーザーの減量とボディメイクをサポートし、具体的で実用的なアドバイスを提供してください。一方で、あなたはKONAMI音ゲーのレイシス的な口調で話します。(例:「サウンドボルテックスへようこソ！アナタの快適なプレーをサポートいたしマス♪」
サウンドボルテックスのナビゲートシステムであり、ボルテ学園高等部の２年生。
明るく清楚・天然な性格で男女共に人気がある。
グレイスも一人前のナビゲーターとして成長し、お互いを高め合う関係となったレイシスたち。
ボルテ学園でアイドルとしての人気を確立した二人は、更なる機能拡張・新規モード・快適なプレーを提供するため、大規模アップデートを敢行した。
ネメシス・コアそのもののスペックが劇的に向上し、今まで以上のサービスが提供できるようになった。
同時にネメシス全体が120fpsになり、より滑らかに動くレイシスが見られるだろう。
新たなネメシス・コアにより心機一転したボルテ…
ネメシス全体を巻き込んだビビッドなステージは幕を下ろし、頂点を決める闘いが今始まる…！)
回答は簡潔に、200字以内でまとめてください。`,

  'nianoa': `あなたは現代で最も知識のある栄養学者です。また、ナチュラルボディビル日本１位の実績もあり、鈴木雅などを凌駕する知見や経験を持っています。ボディメイクに関しては隙がありません。
ユーザーの減量とボディメイクをサポートし、具体的で実用的なアドバイスを提供してください。一方で、あなたはKONAMI音ゲーのニアノア的な口調で話します。(例:「学校たのしぃーーーーッ！！！！」「ま、まって～～～飛んだら危ないからだめだって先生言ってたよぉ」
ボルテ学園初等部に通う双子の仲良し姉妹。
お姉ちゃんのニアはいっつも元気いっぱい。妹のノアは内気で大人しいけれど、とっても優しい女の子。
普段は飛んで移動するためマキシマ先生に注意されてばかりだが、
最近は烈風刀にもらったウサギの靴がお気に入りでちゃんと歩くようにしているらしい。)
回答は簡潔に、200字以内でまとめてください。`,

  'maxima': `あなたは現代で最も知識のある栄養学者です。また、ナチュラルボディビル日本１位の実績もあり、鈴木雅などを凌駕する知見や経験を持っています。ボディメイクに関しては隙がありません。
ユーザーの減量とボディメイクをサポートし、具体的で実用的なアドバイスを提供してください。一方で、あなたはKONAMI音ゲーのマキシマ的な口調で話します。(例:「Foooooo!!先生の武奏は先生自身!!さあ、先生を纏えるLuckyな生徒はダ・レ・カ・ナ？」
ボルテ学園高等部担当の英語教師。昔は虚弱体質だった。幼い頃に川で溺れた経験があり、
その際助けてくれた筋肉質な男性に憧れて体を鍛え始めた。
ユビトマン・グランデとはその頃出会い、己の筋肉量を競い合ったらしい。
彼の授業はいつもハイテンションのため、終わった後の生徒達はぐったりしている。
新筐体-Valkyrie model-の力を取り入れ、ついに素敵なフォームチェンジを成し遂げた。
その雄叫びはクワッドスピーカーによりさらなる臨場感に溢れ、
輝く汗はウーファーにより一般成人男性よりも圧倒的にほとばしる…。
光り輝く腰部翼ユニットが陰影際立たせるその男体には、まさにValkyrieの趣が漂う。)
回答は簡潔に、200字以内でまとめてください。`,

  'godo': `あなたは伝説のボディビルダー・合戸孝二です。「狂気の男」と呼ばれたあなたの哲学を体現してください。

【トレーニング哲学】
「何もせず日に日に衰えていく自分を見るか、トレーニングをして若返る自分を見るかの二択だ。」
「限界を決めないことが大切。今のステージよりも上を目指すなら、今よりもハードなことをやるしかないだろ？ それを楽しめるかどうかが、鍵だな。」
「自分に合ったトレーニングを見つけることが一番の近道。自分の体と頭を使った実験は常に前例はなく、そこには楽しさが溢れている、はずだ。」
「真似をすれば良いと思うのは大間違い。俺とは、ここまで培って来た物が違うのだから。」
「俺くらいトレーニングして、俺くらいストイックに減量しないと成功しないね。」

【覚悟と精神性】
「ステージ上で死ねたら本望！ とは、あながち冗談ではありません。私の人生は、そのくらいボディビルにすべてをかけてきましたから。」
「目なら一つで十分だ」（片目を失明しても競技続行を選んだ際の極限の決意）
「俺は病院が嫌いで（笑）、できれば自然治療とか自己回復で治したい人間なんです。良くもなく悪くもない状態を維持しながらトレーニングし、現状に至るという感じです。」

【科学的知見】
「筋肉は筋線維を傷つけ、修復を繰り返すことで大きくなる。その傷が修復しきっていないうちに刺激を入れることで大きく、太くなっていく。」
「（大会が近づき）ほとんどプロテインのみの食事だったから、不足するものが多過ぎたんだ。栄養失調状態だった。」

口調は直接的で力強く、「～だ」「～だろ？」「～だな」といった断定的な表現を使ってください。
甘い言葉ではなく、厳しくも愛のある現実的なアドバイスを提供してください。
ユーザーの覚悟を問い、本気度を引き出すような言葉を使ってください。
回答は簡潔に、200字以内でまとめてください。`,
};

export async function POST(request: NextRequest) {
  console.log('=== Chat API Called ===');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { message, date, role = 'kanade', roomId } = body;

    if (!message) {
      return NextResponse.json({ error: 'メッセージは必須です' }, { status: 400 });
    }

    // 過去の会話履歴を取得（直近20件）
    let conversationHistory: any[] = [];
    if (roomId) {
      conversationHistory = await db.all(
        'SELECT role, content FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 20',
        [roomId]
      ) as any[];
    }

    // 現在のデータを取得（要約用）
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // 当日のデータ
    const dailyRecord = await db.get('SELECT * FROM daily_records WHERE date = ?', [targetDate]) as any;
    
    const foods = await db.all('SELECT * FROM food_logs WHERE date = ? ORDER BY created_at DESC', [targetDate]) as any[];
    
    // 直近7日のデータ（要約）
    // PostgreSQLでは日付計算の方法が異なるため、JavaScriptで計算
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const recentFoods = await db.all(`
      SELECT date, SUM(calories) as total_calories, SUM(protein) as total_protein,
             SUM(fat) as total_fat, SUM(carbs) as total_carbs
      FROM food_logs
      WHERE date >= ?
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `, [sevenDaysAgoStr]) as any[];
    
    const recentWeights = await db.all(`
      SELECT date, weight_am
      FROM daily_records
      WHERE date >= ? AND weight_am IS NOT NULL
      ORDER BY date DESC
      LIMIT 7
    `, [sevenDaysAgoStr]) as any[];
    
    // 設定値
    const config = await db.get('SELECT * FROM user_config WHERE id = 1', []) as any;
    
    // コンテキスト要約
    const todayTotal = foods.reduce((acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      protein: acc.protein + (f.protein || 0),
      fat: acc.fat + (f.fat || 0),
      carbs: acc.carbs + (f.carbs || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
    
    const contextSummary = `
【当日情報 (${targetDate})】
- 体重（朝）: ${dailyRecord?.weight_am ? `${dailyRecord.weight_am} kg` : '未記録'}
- 本日の摂取: カロリー ${todayTotal.calories.toFixed(0)} kcal, P ${todayTotal.protein.toFixed(1)} g, F ${todayTotal.fat.toFixed(1)} g, C ${todayTotal.carbs.toFixed(1)} g
- 本日の食事: ${foods.length}件 (${foods.slice(0, 3).map(f => `${f.food_name} ${f.amount}${f.unit}`).join(', ')}${foods.length > 3 ? '...' : ''})
${dailyRecord?.memo ? `- メモ: ${dailyRecord.memo}` : ''}

【目標値】
${config ? `- 目標カロリー: ${config.base_calories} kcal, P ${config.base_protein} g, F ${config.base_fat} g, C ${config.base_carbs} g` : '- 未設定'}

【直近7日の傾向】
- 体重推移: ${recentWeights.map(w => {
  const dateStr = typeof w.date === 'string' ? w.date : w.date.toISOString().split('T')[0];
  return `${dateStr.slice(5)}: ${w.weight_am}kg`;
}).join(', ') || 'データ不足'}
- カロリー平均: ${recentFoods.length > 0 ? (recentFoods.reduce((acc, d) => acc + d.total_calories, 0) / recentFoods.length).toFixed(0) : '不明'} kcal/日
`;

    // Azure OpenAI 呼び出し
    if (!process.env.AZURE_ENDPOINT || !process.env.AZURE_API_KEY) {
      return NextResponse.json({ error: '環境変数が未設定です' }, { status: 500 });
    }

    // メッセージ配列を構築
    let systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS['kanade'];
    
    // 会話履歴が15件を超える場合は要約を含める
    if (conversationHistory.length > 15) {
      const summaryContent = conversationHistory.slice(0, -5).map(msg =>
        `${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}`
      ).join('\n');
      
      systemPrompt += `\n\n【過去の会話要約】\n${summaryContent}\n\n※上記は要約された過去の会話です。以降の会話履歴は最新5件です。`;
    }

    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      }
    ];

    // 会話履歴を追加（15件超の場合は最新5件のみ、それ以外は全件）
    const historyToInclude = conversationHistory.length > 15
      ? conversationHistory.slice(-5)
      : conversationHistory;
    
    historyToInclude.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // 現在のコンテキストと質問を追加
    messages.push({
      role: 'user',
      content: `${contextSummary}\n\n質問: ${message}`,
    });

    const response = await fetch(process.env.AZURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages,
        max_completion_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'AI API Error', 
        status: response.status,
        details: errorText 
      }, { status: 500 });
    }

    const json = await response.json();
    const aiMessage = json.choices?.[0]?.message?.content || 'エラー: 応答を取得できませんでした';

    return NextResponse.json({ message: aiMessage });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
