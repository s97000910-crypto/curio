import { query, queryOne, execute } from '../db';
import { Notification, NotificationPreferences } from '../db/types';

export function getUserNotifications(userId: string): Notification[] {
  const sql = `
    SELECT 
      n.*,
      u.display_name AS sender_name,
      u.avatar_url AS sender_avatar
    FROM notifications n
    LEFT JOIN profiles u ON n.sender_id = u.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `;

  const rows = query(sql, [userId]);
  return rows.map((r) => ({
    ...r,
    is_read: Boolean(r.is_read),
  }));
}

export function getUnreadNotificationCount(userId: string): number {
  const result = queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return result?.count ?? 0;
}

export function markNotificationRead(notificationId: string, userId: string): boolean {
  execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId]);
  return true;
}

export function markAllNotificationsRead(userId: string): boolean {
  execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  return true;
}

export function getNotificationPreferences(userId: string): NotificationPreferences {
  const raw = queryOne('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
  if (!raw) {
    execute('INSERT INTO notification_preferences (user_id) VALUES (?)', [userId]);
    return {
      user_id: userId,
      email_notifications: false,
      in_app_replies: true,
      in_app_mentions: true,
      in_app_invites: true,
      in_app_reactions: true,
    };
  }

  return {
    user_id: raw.user_id,
    email_notifications: Boolean(raw.email_notifications),
    in_app_replies: Boolean(raw.in_app_replies),
    in_app_mentions: Boolean(raw.in_app_mentions),
    in_app_invites: Boolean(raw.in_app_invites),
    in_app_reactions: Boolean(raw.in_app_reactions),
  };
}

export function updateNotificationPreferences(
  userId: string,
  prefs: Partial<Omit<NotificationPreferences, 'user_id'>>
): NotificationPreferences {
  const current = getNotificationPreferences(userId);
  const updated = { ...current, ...prefs };

  execute(
    `INSERT INTO notification_preferences (
      user_id, email_notifications, in_app_replies, in_app_mentions, in_app_invites, in_app_reactions
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      email_notifications = excluded.email_notifications,
      in_app_replies = excluded.in_app_replies,
      in_app_mentions = excluded.in_app_mentions,
      in_app_invites = excluded.in_app_invites,
      in_app_reactions = excluded.in_app_reactions`,
    [
      userId,
      updated.email_notifications ? 1 : 0,
      updated.in_app_replies ? 1 : 0,
      updated.in_app_mentions ? 1 : 0,
      updated.in_app_invites ? 1 : 0,
      updated.in_app_reactions ? 1 : 0,
    ]
  );

  return updated;
}
