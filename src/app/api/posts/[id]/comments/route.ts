import { NextRequest, NextResponse } from 'next/server';
import { getCommentsForPost, createComment } from '@/lib/services/comments';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const comments = getCommentsForPost(id, currentUserId);
    return NextResponse.json({ comments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    const comment = createComment({
      postId: id,
      authorId: currentUserId,
      content: body.content,
      parentId: body.parentId,
    });

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
