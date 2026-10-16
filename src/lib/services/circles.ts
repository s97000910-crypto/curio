import { query, queryOne, execute, transaction } from '../db';
import { Circle, CircleMilestone, CircleDiscussion } from '../db/types';

export function getCircles(options: { subject?: string; search?: string; currentUserId?: string } = {}): Circle[] {
  const { subject, search, currentUserId } = options;

  let whereClauses: string[] = ["c.status = 'active'"];
  const params: any[] = [];

  // If user is not authenticated or a circle is private:
  // Non-members can only see public circles!
  if (currentUserId) {
    whereClauses.push('(c.is_private = 0 OR c.id IN (SELECT circle_id FROM circle_members WHERE user_id = ?))');
    params.push(currentUserId);
  } else {
    whereClauses.push('c.is_private = 0');
  }

  if (subject && subject !== 'All') {
    whereClauses.push('c.subject = ?');
    params.push(subject);
  }

  if (search && search.trim()) {
    whereClauses.push('(c.name LIKE ? OR c.description LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const sql = `
    SELECT 
      c.*,
      u.display_name AS creator_name,
      (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) AS member_count
    FROM circles c
    JOIN profiles u ON c.creator_id = u.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY c.created_at DESC
  `;

  const rows = query(sql, params);
  return rows.map((c) => hydrateCircle(c, currentUserId));
}

export function getCircleById(id: string, currentUserId?: string): Circle | null {
  const sql = `
    SELECT 
      c.*,
      u.display_name AS creator_name,
      (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) AS member_count
    FROM circles c
    JOIN profiles u ON c.creator_id = u.id
    WHERE c.id = ? OR c.slug = ?
  `;

  const raw = queryOne(sql, [id, id]);
  if (!raw) return null;

  // Authorization check for private circles
  if (Boolean(raw.is_private)) {
    if (!currentUserId) {
      throw new Error('Access denied: this study circle is private. Please sign in to view.');
    }
    const isMember = queryOne(
      'SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?',
      [raw.id, currentUserId]
    );
    if (!isMember) {
      throw new Error('Access denied: this study circle is private to its members.');
    }
  }

  return hydrateCircle(raw, currentUserId);
}

function hydrateCircle(raw: any, currentUserId?: string): Circle {
  let isMember = false;
  let role: 'organizer' | 'member' | undefined = undefined;

  if (currentUserId) {
    const mem = queryOne<{ role: 'organizer' | 'member' }>(
      'SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?',
      [raw.id, currentUserId]
    );
    if (mem) {
      isMember = true;
      role = mem.role;
    }
  }

  return {
    ...raw,
    is_private: Boolean(raw.is_private),
    is_member: isMember,
    role,
  };
}

export function getCircleMilestones(circleId: string): CircleMilestone[] {
  const rows = query('SELECT * FROM circle_milestones WHERE circle_id = ? ORDER BY target_date ASC', [circleId]);
  return rows.map((r) => ({
    ...r,
    is_completed: Boolean(r.is_completed),
  }));
}

export function getCircleDiscussions(circleId: string, currentUserId?: string): CircleDiscussion[] {
  // Enforce private circle check
  const circle = getCircleById(circleId, currentUserId);
  if (!circle) throw new Error('Circle not found');

  const sql = `
    SELECT 
      d.*,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar
    FROM circle_discussions d
    JOIN profiles u ON d.author_id = u.id
    WHERE d.circle_id = ?
    ORDER BY d.created_at ASC
  `;

  return query<CircleDiscussion>(sql, [circle.id]);
}

export function createCircle(data: {
  name: string;
  slug: string;
  description: string;
  subject: string;
  is_private: boolean;
  creator_id: string;
}): Circle {
  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!cleanSlug) throw new Error('Valid URL slug is required');

  const existing = queryOne('SELECT 1 FROM circles WHERE slug = ?', [cleanSlug]);
  if (existing) throw new Error('A study circle with this slug already exists');

  const id = `circ_${cleanSlug}`;

  return transaction((db) => {
    db.prepare(`
      INSERT INTO circles (id, name, slug, description, subject, is_private, creator_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id,
      data.name.trim(),
      cleanSlug,
      data.description.trim(),
      data.subject,
      data.is_private ? 1 : 0,
      data.creator_id
    );

    // Add creator as organizer
    db.prepare("INSERT INTO circle_members (id, circle_id, user_id, role) VALUES (?, ?, ?, 'organizer')").run(
      `cm_${Date.now()}`,
      id,
      data.creator_id
    );

    return getCircleById(id, data.creator_id)!;
  });
}

export function toggleCircleMembership(circleId: string, userId: string): { joined: boolean } {
  return transaction((db) => {
    const existing = db
      .prepare('SELECT id, role FROM circle_members WHERE circle_id = ? AND user_id = ?')
      .get(circleId, userId) as { id: string; role: string } | undefined;

    if (existing) {
      if (existing.role === 'organizer') {
        const otherOrganizers = db
          .prepare("SELECT COUNT(*) as count FROM circle_members WHERE circle_id = ? AND role = 'organizer'")
          .get(circleId) as { count: number };
        if (otherOrganizers.count <= 1) {
          throw new Error('You cannot leave the circle as the sole organizer. Assign another organizer or archive the circle.');
        }
      }
      db.prepare('DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?').run(circleId, userId);
      return { joined: false };
    } else {
      // Check if circle is private
      const circle = db.prepare('SELECT is_private FROM circles WHERE id = ?').get(circleId) as { is_private: number };
      if (circle && circle.is_private === 1) {
        throw new Error('This circle is private. An invitation from an organizer is required.');
      }

      db.prepare("INSERT INTO circle_members (id, circle_id, user_id, role) VALUES (?, ?, ?, 'member')").run(
        `cm_${Date.now()}`,
        circleId,
        userId
      );
      return { joined: true };
    }
  });
}

export function addMilestone(circleId: string, userId: string, data: { title: string; description?: string; target_date?: string }): CircleMilestone {
  const member = queryOne<{ role: string }>('SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?', [circleId, userId]);
  if (!member || member.role !== 'organizer') {
    throw new Error('Only organizers can manage milestones');
  }

  const id = `ms_${Date.now()}`;
  execute(
    'INSERT INTO circle_milestones (id, circle_id, title, description, target_date, is_completed) VALUES (?, ?, ?, ?, ?, 0)',
    [id, circleId, data.title.trim(), data.description || null, data.target_date || null]
  );

  return {
    id,
    circle_id: circleId,
    title: data.title.trim(),
    description: data.description,
    target_date: data.target_date,
    is_completed: false,
    created_at: new Date().toISOString(),
  };
}

export function toggleMilestone(milestoneId: string, isCompleted: boolean): boolean {
  execute('UPDATE circle_milestones SET is_completed = ? WHERE id = ?', [isCompleted ? 1 : 0, milestoneId]);
  return true;
}

export function addCircleDiscussion(circleId: string, authorId: string, data: { title: string; content: string }): CircleDiscussion {
  const isMember = queryOne('SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?', [circleId, authorId]);
  if (!isMember) {
    throw new Error('You must be a member of this circle to post discussions');
  }

  const id = `cd_${Date.now()}`;
  execute(
    'INSERT INTO circle_discussions (id, circle_id, author_id, title, content) VALUES (?, ?, ?, ?, ?)',
    [id, circleId, authorId, data.title.trim(), data.content.trim()]
  );

  return queryOne<CircleDiscussion>(
    `SELECT d.*, u.display_name as author_name, u.avatar_url as author_avatar
     FROM circle_discussions d JOIN profiles u ON d.author_id = u.id WHERE d.id = ?`,
    [id]
  )!;
}
