import { NextRequest, NextResponse } from 'next/server';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/services/notifications';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();
    const preferences = getNotificationPreferences(currentUserId);
    return NextResponse.json({ preferences });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();
    const preferences = updateNotificationPreferences(currentUserId, body);
    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
