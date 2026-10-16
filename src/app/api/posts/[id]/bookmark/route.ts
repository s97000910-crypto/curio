import { NextRequest, NextResponse } from 'next/server';
import { toggleBookmark } from '@/lib/services/posts';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const result = toggleBookmark(currentUserId, 'post', id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
