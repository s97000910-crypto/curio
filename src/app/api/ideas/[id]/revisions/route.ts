import { NextRequest, NextResponse } from 'next/server';
import { addInvestigationRevision } from '@/lib/services/ideas';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    const revision = addInvestigationRevision(id, currentUserId, {
      hypothesis: body.hypothesis,
      proposed_arguments: body.proposed_arguments,
      citations: body.citations,
      change_summary: body.change_summary,
      status: body.status,
    });

    return NextResponse.json({ success: true, revision });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
