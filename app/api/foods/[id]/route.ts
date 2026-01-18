import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-wrapper';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.execute('DELETE FROM food_logs WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}