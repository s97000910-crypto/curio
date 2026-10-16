import { NextRequest, NextResponse } from 'next/server';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/services/notifications';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();
    const notifications = getUserNotifications(currentUserId);
    const unreadCount = getUnreadNotificationCount(currentUserId);
    return NextResponse.json({ notifications, unread_count: unreadCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load notifications.' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    if (body.all) {
      markAllNotificationsRead(currentUserId);
    } else if (body.id) {
      markNotificationRead(body.id, currentUserId);
    } else {
      return NextResponse.json({ error: 'Notification id or all=true is required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update notifications.' },
      { status: getAuthErrorStatus(error, 400) }
    );
  }
}
