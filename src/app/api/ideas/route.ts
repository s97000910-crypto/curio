import { NextRequest, NextResponse } from 'next/server';
import { getInvestigations, createInvestigation } from '@/lib/services/ideas';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const investigations = getInvestigations({ subject, status, search });
    return NextResponse.json({ investigations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    const investigation = createInvestigation({
      ...body,
      creator_id: currentUserId,
    });

    return NextResponse.json({ success: true, investigation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
