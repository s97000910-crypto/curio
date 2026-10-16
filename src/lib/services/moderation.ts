import { query, queryOne, execute, transaction } from '../db';
import { Report, ModerationAction } from '../db/types';

export function createReport(data: {
  reporter_id: string;
  target_type: 'post' | 'comment' | 'user' | 'resource' | 'circle';
  target_id: string;
  reason: 'harassment' | 'spam' | 'copyright' | 'hate_speech' | 'misinformation' | 'other';
  details: string;
}): Report {
  if (!data.details.trim()) {
    throw new Error('Details are required when submitting a safety report');
  }

  const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  execute(
    `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [id, data.reporter_id, data.target_type, data.target_id, data.reason, data.details.trim()]
  );

  return queryOne<Report>('SELECT * FROM reports WHERE id = ?', [id])!;
}

export function getReportsQueue(
  moderatorId: string,
  status: string = 'pending'
): Report[] {
  // Enforce server-side role check
  const mod = queryOne<{ role: string }>('SELECT role FROM profiles WHERE id = ?', [moderatorId]);
  if (!mod || (mod.role !== 'moderator' && mod.role !== 'admin')) {
    throw new Error('Unauthorized: only moderators and administrators can access the moderation queue');
  }

  let sql = `
    SELECT 
      r.*,
      u.display_name AS reporter_name,
      m.display_name AS moderator_name
    FROM reports r
    JOIN profiles u ON r.reporter_id = u.id
    LEFT JOIN profiles m ON r.moderator_id = m.id
  `;

  const params: any[] = [];
  if (status && status !== 'all') {
    sql += ' WHERE r.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY r.created_at DESC';

  return query<Report>(sql, params);
}

export function takeModeratorAction(data: {
  moderatorId: string;
  reportId: string;
  action: 'warning' | 'remove_content' | 'suspend_user' | 'ban_user' | 'dismiss_report';
  reason: string;
}): { success: boolean; actionId: string } {
  // Enforce server-side role check
  const mod = queryOne<{ role: string; display_name: string }>(
    'SELECT role, display_name FROM profiles WHERE id = ?',
    [data.moderatorId]
  );
  if (!mod || (mod.role !== 'moderator' && mod.role !== 'admin')) {
    throw new Error('Unauthorized: only moderators and administrators can take moderation actions');
  }

  const report = queryOne<Report>('SELECT * FROM reports WHERE id = ?', [data.reportId]);
  if (!report) throw new Error('Report not found');

  return transaction((db) => {
    const actionId = `mod_act_${Date.now()}`;

    // 1. Log in audit trail
    db.prepare(`
      INSERT INTO moderation_actions (id, moderator_id, target_type, target_id, action, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(actionId, data.moderatorId, report.target_type, report.target_id, data.action, data.reason.trim());

    // 2. Perform the target action
    if (data.action === 'remove_content') {
      if (report.target_type === 'post') {
        db.prepare('DELETE FROM posts WHERE id = ?').run(report.target_id);
      } else if (report.target_type === 'comment') {
        db.prepare('DELETE FROM comments WHERE id = ?').run(report.target_id);
      } else if (report.target_type === 'resource') {
        db.prepare('UPDATE resources SET permission_status = "rejected" WHERE id = ?').run(report.target_id);
      }
    } else if (data.action === 'suspend_user' || data.action === 'ban_user') {
      const targetUserId = report.target_type === 'user' ? report.target_id : null;
      if (targetUserId) {
        db.prepare('UPDATE profiles SET is_suspended = 1 WHERE id = ?').run(targetUserId);
      }
    }

    // 3. Update report status
    const newStatus = data.action === 'dismiss_report' ? 'dismissed' : 'resolved';
    db.prepare(`
      UPDATE reports 
      SET status = ?, moderator_id = ?, action_taken = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, data.moderatorId, `${data.action}: ${data.reason}`, data.reportId);

    return { success: true, actionId };
  });
}

export function getModerationAuditLog(moderatorId: string): ModerationAction[] {
  const mod = queryOne<{ role: string }>('SELECT role FROM profiles WHERE id = ?', [moderatorId]);
  if (!mod || (mod.role !== 'moderator' && mod.role !== 'admin')) {
    throw new Error('Unauthorized: only moderators and administrators can view the audit log');
  }

  const sql = `
    SELECT 
      a.*,
      m.display_name AS moderator_name
    FROM moderation_actions a
    JOIN profiles m ON a.moderator_id = m.id
    ORDER BY a.created_at DESC
  `;
  return query<ModerationAction>(sql);
}
