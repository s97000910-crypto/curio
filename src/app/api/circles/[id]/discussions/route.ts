import { NextRequest, NextResponse } from 'next/server';
import { getCircleDiscussions, addCircleDiscussion } from '@/lib/services/circles';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const discussions = getCircleDiscussions(id, currentUserId);
    return NextResponse.json({ discussions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 403) });
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

    const discussion = addCircleDiscussion(id, currentUserId, {
      title: body.title,
      content: body.content,
    });

    return NextResponse.json({ success: true, discussion });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 403) });
  }
}
