import { query, queryOne, execute, transaction } from '../db';
import { Investigation, InvestigationRevision, InvestigationComment, InvestigationStatus } from '../db/types';

export function getInvestigations(options: {
  subject?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Investigation[] {
  const { subject, status, search, limit = 20, offset = 0 } = options;

  let whereClauses: string[] = ['1=1'];
  const params: any[] = [];

  if (subject && subject !== 'All') {
    whereClauses.push('i.subject = ?');
    params.push(subject);
  }

  if (status && status !== 'All') {
    whereClauses.push('i.status = ?');
    params.push(status);
  }

  if (search && search.trim()) {
    whereClauses.push('(i.title LIKE ? OR i.summary LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const sql = `
    SELECT 
      i.*,
      u.display_name AS creator_name
    FROM investigations i
    JOIN profiles u ON i.creator_id = u.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY i.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  return query<Investigation>(sql, params);
}

export function getInvestigationById(id: string): Investigation | null {
  const sql = `
    SELECT 
      i.*,
      u.display_name AS creator_name
    FROM investigations i
    JOIN profiles u ON i.creator_id = u.id
    WHERE i.id = ? OR i.slug = ?
  `;

  const raw = queryOne<Investigation>(sql, [id, id]);
  if (!raw) return null;

  // Fetch revisions with attribution
  const revisionsSql = `
    SELECT 
      r.*,
      u.display_name AS author_name
    FROM investigation_revisions r
    JOIN profiles u ON r.author_id = u.id
    WHERE r.investigation_id = ?
    ORDER BY r.version_num DESC
  `;
  const revisions = query<InvestigationRevision>(revisionsSql, [raw.id]);

  return {
    ...raw,
    revisions,
  };
}

export function createInvestigation(data: {
  title: string;
  slug: string;
  subject: string;
  summary: string;
  hypothesis: string;
  proposed_arguments: string;
  citations?: string;
  creator_id: string;
  status?: InvestigationStatus;
}): Investigation {
  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!cleanSlug) throw new Error('Valid slug is required');

  const existing = queryOne('SELECT 1 FROM investigations WHERE slug = ?', [cleanSlug]);
  if (existing) throw new Error('An investigation with this slug already exists');

  const invId = `idea_${cleanSlug}`;

  return transaction((db) => {
    db.prepare(`
      INSERT INTO investigations (id, title, slug, subject, summary, status, creator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      invId,
      data.title.trim(),
      cleanSlug,
      data.subject,
      data.summary.trim(),
      data.status || 'exploring',
      data.creator_id
    );

    // Create Initial Version 1 revision
    db.prepare(`
      INSERT INTO investigation_revisions (
        id, investigation_id, author_id, version_num, hypothesis, proposed_arguments, citations, change_summary
      ) VALUES (?, ?, ?, 1, ?, ?, ?, 'Initial formulation and research framing')
    `).run(
      `rev_${invId}_1`,
      invId,
      data.creator_id,
      data.hypothesis.trim(),
      data.proposed_arguments.trim(),
      data.citations ? data.citations.trim() : null
    );

    return getInvestigationById(invId)!;
  });
}

export function addInvestigationRevision(
  investigationId: string,
  authorId: string,
  data: {
    hypothesis: string;
    proposed_arguments: string;
    citations?: string;
    change_summary: string;
    status?: InvestigationStatus;
  }
): InvestigationRevision {
  if (!data.change_summary.trim() || !data.hypothesis.trim()) {
    throw new Error('Hypothesis and change summary are required');
  }

  const investigation = getInvestigationById(investigationId);
  if (!investigation) throw new Error('Investigation not found');

  return transaction((db) => {
    const latestRev = db
      .prepare('SELECT MAX(version_num) as max_ver FROM investigation_revisions WHERE investigation_id = ?')
      .get(investigation.id) as { max_ver: number };
    const nextVer = (latestRev.max_ver || 0) + 1;

    const revId = `rev_${investigation.id}_${nextVer}`;
    db.prepare(`
      INSERT INTO investigation_revisions (
        id, investigation_id, author_id, version_num, hypothesis, proposed_arguments, citations, change_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      revId,
      investigation.id,
      authorId,
      nextVer,
      data.hypothesis.trim(),
      data.proposed_arguments.trim(),
      data.citations ? data.citations.trim() : null,
      data.change_summary.trim()
    );

    // Update investigation status and timestamp
    const statusUpdate = data.status || investigation.status;
    db.prepare(`UPDATE investigations SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      statusUpdate,
      investigation.id
    );

    const author = db.prepare('SELECT display_name FROM profiles WHERE id = ?').get(authorId) as { display_name: string };

    return {
      id: revId,
      investigation_id: investigation.id,
      author_id: authorId,
      author_name: author.display_name,
      version_num: nextVer,
      hypothesis: data.hypothesis.trim(),
      proposed_arguments: data.proposed_arguments.trim(),
      citations: data.citations,
      change_summary: data.change_summary.trim(),
      created_at: new Date().toISOString(),
    };
  });
}

export function getInvestigationComments(investigationId: string): InvestigationComment[] {
  const sql = `
    SELECT 
      c.*,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar
    FROM investigation_comments c
    JOIN profiles u ON c.author_id = u.id
    WHERE c.investigation_id = ?
    ORDER BY c.created_at ASC
  `;
  return query<InvestigationComment>(sql, [investigationId]);
}

export function addInvestigationComment(
  investigationId: string,
  authorId: string,
  content: string
): InvestigationComment {
  if (!content.trim()) throw new Error('Comment cannot be empty');

  const id = `ic_${Date.now()}`;
  execute(
    'INSERT INTO investigation_comments (id, investigation_id, author_id, content) VALUES (?, ?, ?, ?)',
    [id, investigationId, authorId, content.trim()]
  );

  return queryOne<InvestigationComment>(
    `SELECT c.*, u.display_name as author_name, u.avatar_url as author_avatar
     FROM investigation_comments c JOIN profiles u ON c.author_id = u.id WHERE c.id = ?`,
    [id]
  )!;
}
