import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// トークルーム削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);

    // メッセージも一緒に削除される（FOREIGN KEY ... ON DELETE CASCADE）
    db.prepare('DELETE FROM chat_rooms WHERE id = ?').run(roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ 
      error: 'Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
