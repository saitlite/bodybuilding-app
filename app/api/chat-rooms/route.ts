import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

// チャットルーム一覧取得
export async function GET() {
  try {
    const rooms = await db.all('SELECT * FROM chat_rooms ORDER BY updated_at DESC', []) as any[];
    
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 新しいチャットルーム作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, ai_role } = body;

    // PostgreSQLではRETURNING idが必要、SQLiteでは不要だが両方で動作する
    const result = await db.execute(
      'INSERT INTO chat_rooms (title, ai_role) VALUES (?, ?) RETURNING id',
      [title || '新しい会話', ai_role || 'kanade']
    );

    console.log('Created chat room, result:', result);

    return NextResponse.json({
      id: result.lastInsertId,
      title: title || '新しい会話',
      ai_role: ai_role || 'kanade'
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    return NextResponse.json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
