import { NextRequest, NextResponse } from 'next/server';
import { getReportsQueue, createReport, getModerationAuditLog } from '@/lib/services/moderation';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const currentUserId = await getCurrentUserId();

    const reports = getReportsQueue(currentUserId, status);
    const auditLog = getModerationAuditLog(currentUserId);
    return NextResponse.json({ reports, auditLog });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 403) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    const report = createReport({
      reporter_id: currentUserId,
      target_type: body.target_type,
      target_id: body.target_id,
      reason: body.reason,
      details: body.details,
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
