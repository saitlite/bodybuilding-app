import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

// トークルーム更新（ロール変更など）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    const body = await request.json();
    const { ai_role, title } = body;

    // 更新するフィールドを動的に構築
    const updates: string[] = [];
    const values: any[] = [];

    if (ai_role) {
      updates.push('ai_role = ?');
      values.push(ai_role);
    }
    if (title) {
      updates.push('title = ?');
      values.push(title);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(roomId);

    await db.execute(
      `UPDATE chat_rooms SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// トークルーム削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);

    // メッセージも一緒に削除される（FOREIGN KEY ... ON DELETE CASCADE）
    await db.execute('DELETE FROM chat_rooms WHERE id = ?', [roomId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
