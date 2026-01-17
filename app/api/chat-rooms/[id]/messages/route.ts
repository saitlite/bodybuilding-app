import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 特定のルームのメッセージ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    
    const messages = db
      .prepare('SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC')
      .all(roomId) as any[];
    
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
    const { role, content } = body;

    const result = db
      .prepare('INSERT INTO chat_messages (room_id, role, content) VALUES (?, ?, ?)')
      .run(roomId, role, content);

    // ルームの更新日時を更新
    db.prepare("UPDATE chat_rooms SET updated_at = datetime('now') WHERE id = ?")
      .run(roomId);
    
    // 最初のユーザーメッセージの場合、タイトルを更新
    const messageCount = (db.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE room_id = ?').get(roomId) as any).count;
    if (messageCount === 1 && role === 'user') {
      // 最初の30文字をタイトルにする
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      db.prepare('UPDATE chat_rooms SET title = ? WHERE id = ?').run(title, roomId);
    }

    return NextResponse.json({
      id: result.lastInsertRowid,
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
