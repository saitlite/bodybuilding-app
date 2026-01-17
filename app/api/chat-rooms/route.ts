import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// チャットルーム一覧取得
export async function GET() {
  try {
    const rooms = db
      .prepare('SELECT * FROM chat_rooms ORDER BY updated_at DESC')
      .all() as any[];
    
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
    const { title } = body;

    const result = db
      .prepare('INSERT INTO chat_rooms (title) VALUES (?)')
      .run(title || '新しい会話');

    return NextResponse.json({ 
      id: result.lastInsertRowid,
      title: title || '新しい会話'
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
