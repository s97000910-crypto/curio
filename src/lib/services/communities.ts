import { randomUUID } from 'node:crypto';
import { query, queryOne, execute, transaction } from '../db';
import { Community } from '../db/types';

export function getCommunities(category?: string, currentUserId?: string): Community[] {
  let sql = 'SELECT * FROM communities';
  const params: any[] = [];

  if (category && category !== 'All') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY member_count DESC, name ASC';
  const rows = query(sql, params);

  return rows.map((c) => hydrateCommunity(c, currentUserId));
}

export function getCommunityBySlug(slug: string, currentUserId?: string): Community | null {
  const raw = queryOne('SELECT * FROM communities WHERE slug = ?', [slug]);
  if (!raw) return null;
  return hydrateCommunity(raw, currentUserId);
}

export function getCommunityById(id: string, currentUserId?: string): Community | null {
  const raw = queryOne('SELECT * FROM communities WHERE id = ?', [id]);
  if (!raw) return null;
  return hydrateCommunity(raw, currentUserId);
}

function hydrateCommunity(community: any, currentUserId?: string): Community {
  let isMember = false;
  let canManageImage = false;
  if (currentUserId) {
    const mem = queryOne(
      'SELECT role FROM community_memberships WHERE community_id = ? AND user_id = ?',
      [community.id, currentUserId]
    ) as { role: string } | null;
    isMember = Boolean(mem);
    canManageImage =
      community.creator_id === currentUserId || mem?.role === 'admin' || mem?.role === 'moderator';
  }

  return {
    ...community,
    is_private: Boolean(community.is_private),
    is_member: isMember,
    can_manage_image: canManageImage,
  };
}

export function canManageCommunityImage(communityId: string, userId: string): boolean {
  const community = queryOne(
    'SELECT creator_id FROM communities WHERE id = ?',
    [communityId]
  ) as { creator_id: string | null } | null;
  if (!community) return false;
  if (community.creator_id === userId) return true;

  const membership = queryOne(
    "SELECT role FROM community_memberships WHERE community_id = ? AND user_id = ?",
    [communityId, userId]
  ) as { role: string } | null;
  return membership?.role === 'admin' || membership?.role === 'moderator';
}

export function getCommunityImage(slug: string): {
  image_data: Uint8Array;
  content_type: string;
} | null {
  return queryOne(
    `SELECT community_images.image_data, community_images.content_type
     FROM community_images
     JOIN communities ON communities.id = community_images.community_id
     WHERE communities.slug = ?`,
    [slug]
  ) as { image_data: Uint8Array; content_type: string } | null;
}

export function saveCommunityImage(
  communityId: string,
  slug: string,
  userId: string,
  imageData: Uint8Array,
  contentType: string
): string {
  if (!canManageCommunityImage(communityId, userId)) {
    throw new Error('Only community creators, admins, or moderators can change this picture');
  }

  const imageUrl = `/api/communities/${encodeURIComponent(slug)}/image?v=${randomUUID()}`;
  transaction((db) => {
    db.prepare(`
      INSERT INTO community_images (community_id, image_data, content_type, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(community_id) DO UPDATE SET
        image_data = excluded.image_data,
        content_type = excluded.content_type,
        updated_at = datetime('now')
    `).run(communityId, imageData, contentType);
    db.prepare('UPDATE communities SET image_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(imageUrl, communityId);
  });
  return imageUrl;
}

export function removeCommunityImage(communityId: string, userId: string): void {
  if (!canManageCommunityImage(communityId, userId)) {
    throw new Error('Only community creators, admins, or moderators can change this picture');
  }

  transaction((db) => {
    db.prepare('DELETE FROM community_images WHERE community_id = ?').run(communityId);
    db.prepare('UPDATE communities SET image_url = NULL, updated_at = datetime(\'now\') WHERE id = ?')
      .run(communityId);
  });
}

export function toggleCommunityMembership(
  communityId: string,
  userId: string
): { joined: boolean; member_count: number } {
  return transaction((db) => {
    const existing = db
      .prepare('SELECT id FROM community_memberships WHERE community_id = ? AND user_id = ?')
      .get(communityId, userId);

    if (existing) {
      db.prepare('DELETE FROM community_memberships WHERE community_id = ? AND user_id = ?').run(
        communityId,
        userId
      );
      db.prepare('UPDATE communities SET member_count = MAX(0, member_count - 1) WHERE id = ?').run(communityId);
      const updated = db.prepare('SELECT member_count FROM communities WHERE id = ?').get(communityId) as {
        member_count: number;
      };
      return { joined: false, member_count: updated.member_count };
    } else {
      const id = `mem_${Date.now()}`;
      db.prepare(
        "INSERT INTO community_memberships (id, community_id, user_id, role) VALUES (?, ?, ?, 'member')"
      ).run(id, communityId, userId);
      db.prepare('UPDATE communities SET member_count = member_count + 1 WHERE id = ?').run(communityId);
      const updated = db.prepare('SELECT member_count FROM communities WHERE id = ?').get(communityId) as {
        member_count: number;
      };
      return { joined: true, member_count: updated.member_count };
    }
  });
}

export function createCommunity(data: {
  name: string;
  slug: string;
  description: string;
  rules: string;
  category: string;
  icon?: string;
  color?: string;
  creator_id: string;
}): Community {
  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!cleanSlug) throw new Error('Valid slug is required');

  const existing = queryOne('SELECT 1 FROM communities WHERE slug = ?', [cleanSlug]);
  if (existing) throw new Error('A community with this URL identifier already exists');

  const id = `c_${cleanSlug}`;

  return transaction((db) => {
    db.prepare(`
      INSERT INTO communities (id, name, slug, description, rules, category, icon, color, creator_id, is_private, member_count, post_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0)
    `).run(
      id,
      data.name.trim(),
      cleanSlug,
      data.description.trim(),
      data.rules.trim(),
      data.category,
      data.icon || 'Compass',
      data.color || '#8B5CF6',
      data.creator_id
    );

    // Add creator as admin member
    db.prepare(`
      INSERT INTO community_memberships (id, community_id, user_id, role)
      VALUES (?, ?, ?, 'admin')
    `).run(`mem_${Date.now()}`, id, data.creator_id);

    return getCommunityById(id, data.creator_id)!;
  });
}
