import { NextRequest, NextResponse } from 'next/server';
import { getInvestigationComments, addInvestigationComment } from '@/lib/services/ideas';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = getInvestigationComments(id);
    return NextResponse.json({ comments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const comment = addInvestigationComment(id, currentUserId, body.content);
    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
