import { NextRequest, NextResponse } from 'next/server';
import { getLectures, suggestLecture } from '@/lib/services/lectures';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const search = searchParams.get('search') || undefined;
    const currentUserId = await getCurrentUserId();

    const lectures = getLectures({ subject, difficulty, search, currentUserId });
    return NextResponse.json({ lectures });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lecture = suggestLecture(body);
    return NextResponse.json({ success: true, lecture });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
