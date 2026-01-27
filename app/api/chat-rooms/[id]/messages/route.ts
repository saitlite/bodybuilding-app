import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

// 特定のルームのメッセージ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    
    const messages = await db.all('SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC', [roomId]) as any[];
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// メッセージ追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    const body = await request.json();
    const { role, content, image_url } = body;

    const result = await db.execute(
      'INSERT INTO chat_messages (room_id, role, content, image_url) VALUES (?, ?, ?, ?)',
      [roomId, role, content, image_url || null]
    );

    // ルームの更新日時を更新
    await db.execute("UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [roomId]);
    
    // 最初のユーザーメッセージの場合、タイトルを更新
    const countResult = await db.get('SELECT COUNT(*) as count FROM chat_messages WHERE room_id = ?', [roomId]) as any;
    const messageCount = Number(countResult?.count || 0);
    
    if (messageCount === 1 && role === 'user') {
      // 最初の30文字をタイトルにする
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      await db.execute('UPDATE chat_rooms SET title = ? WHERE id = ?', [title, roomId]);
    }

    return NextResponse.json({
      id: result.lastInsertId,
      room_id: roomId,
      role,
      content
    });
  } catch (error) {
    console.error('Add message error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
