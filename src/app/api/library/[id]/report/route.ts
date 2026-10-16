import { NextRequest, NextResponse } from 'next/server';
import { reportResource } from '@/lib/services/library';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    reportResource({
      resourceId: id,
      reporterId: currentUserId,
      reason: body.reason,
      details: body.details,
    });

    return NextResponse.json({ success: true, message: 'Report submitted for editorial review' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
