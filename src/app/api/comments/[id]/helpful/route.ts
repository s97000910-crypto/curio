import { NextRequest, NextResponse } from 'next/server';
import { toggleCommentHelpful } from '@/lib/services/comments';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const isHelpful = toggleCommentHelpful(id, currentUserId);
    return NextResponse.json({ success: true, isHelpful });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 403) });
  }
}
