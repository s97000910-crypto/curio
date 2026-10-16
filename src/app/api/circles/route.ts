import { NextRequest, NextResponse } from 'next/server';
import { getCircles, createCircle } from '@/lib/services/circles';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || undefined;
    const search = searchParams.get('search') || undefined;
    const currentUserId = await getCurrentUserId();

    const circles = getCircles({ subject, search, currentUserId });
    return NextResponse.json({ circles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    const circle = createCircle({
      ...body,
      creator_id: currentUserId,
    });

    return NextResponse.json({ success: true, circle });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
