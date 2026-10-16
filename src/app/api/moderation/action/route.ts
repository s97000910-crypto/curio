import { NextRequest, NextResponse } from 'next/server';
import { takeModeratorAction } from '@/lib/services/moderation';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    const result = takeModeratorAction({
      moderatorId: currentUserId,
      reportId: body.reportId,
      action: body.action,
      reason: body.reason,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 403) });
  }
}
