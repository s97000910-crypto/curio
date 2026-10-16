import { query, queryOne, execute, transaction } from '../db';
import { Resource, ResourceLicense, ResourceReport } from '../db/types';

export interface ResourceFilterOptions {
  subject?: string;
  difficulty?: string;
  search?: string;
  licenseId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function getResources(options: ResourceFilterOptions = {}): Resource[] {
  const { subject, difficulty, search, licenseId, status = 'verified', limit = 30, offset = 0 } = options;

  let whereClauses: string[] = ['1=1'];
  const params: any[] = [];

  if (status && status !== 'all') {
    whereClauses.push('r.permission_status = ?');
    params.push(status);
  }

  if (subject && subject !== 'All') {
    whereClauses.push('r.subject = ?');
    params.push(subject);
  }

  if (difficulty && difficulty !== 'All') {
    whereClauses.push('r.difficulty_level = ?');
    params.push(difficulty);
  }

  if (licenseId && licenseId !== 'All') {
    whereClauses.push('r.license_id = ?');
    params.push(licenseId);
  }

  if (search && search.trim()) {
    whereClauses.push('(r.title LIKE ? OR r.author LIKE ? OR r.description LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const sql = `
    SELECT 
      r.*,
      l.code AS license_code,
      l.name AS license_name,
      l.url AS license_url,
      l.can_redistribute AS license_can_redistribute,
      l.attribution_required AS license_attribution_required,
      l.commercial_allowed AS license_commercial_allowed,
      u.display_name AS uploader_name
    FROM resources r
    JOIN resource_licenses l ON r.license_id = l.id
    JOIN profiles u ON r.uploader_id = u.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY r.download_count DESC, r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  const rows = query(sql, params);

  return rows.map(hydrateResource);
}

export function getResourceById(id: string): Resource | null {
  const sql = `
    SELECT 
      r.*,
      l.code AS license_code,
      l.name AS license_name,
      l.url AS license_url,
      l.can_redistribute AS license_can_redistribute,
      l.attribution_required AS license_attribution_required,
      l.commercial_allowed AS license_commercial_allowed,
      u.display_name AS uploader_name
    FROM resources r
    JOIN resource_licenses l ON r.license_id = l.id
    JOIN profiles u ON r.uploader_id = u.id
    WHERE r.id = ?
  `;

  const raw = queryOne(sql, [id]);
  if (!raw) return null;
  return hydrateResource(raw);
}

function hydrateResource(raw: any): Resource {
  return {
    ...raw,
    license: {
      id: raw.license_id,
      code: raw.license_code,
      name: raw.license_name,
      url: raw.license_url,
      can_redistribute: Boolean(raw.license_can_redistribute),
      attribution_required: Boolean(raw.license_attribution_required),
      commercial_allowed: Boolean(raw.license_commercial_allowed),
    },
  };
}

export function getLicenses(): ResourceLicense[] {
  const rows = query('SELECT * FROM resource_licenses ORDER BY code ASC');
  return rows.map((r) => ({
    ...r,
    can_redistribute: Boolean(r.can_redistribute),
    attribution_required: Boolean(r.attribution_required),
    commercial_allowed: Boolean(r.commercial_allowed),
  }));
}

export function submitResource(data: {
  title: string;
  author: string;
  description: string;
  subject: string;
  subtopic?: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Specialized';
  publication_year?: number;
  source_url: string;
  license_id: string;
  uploader_id: string;
  legal_confirmation: boolean;
  version?: string;
}): Resource {
  if (!data.legal_confirmation) {
    throw new Error('You must confirm that this resource is legally compliant and authorized for sharing under the selected license.');
  }

  if (!data.title.trim() || !data.author.trim() || !data.source_url.trim()) {
    throw new Error('Title, Author, and Source URL are required.');
  }

  // Validate URL format
  try {
    new URL(data.source_url);
  } catch {
    throw new Error('Please provide a valid HTTP or HTTPS Source URL');
  }

  const license = queryOne('SELECT * FROM resource_licenses WHERE id = ?', [data.license_id]);
  if (!license) {
    throw new Error('Invalid resource license selected');
  }

  const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Resources uploaded by regular users start in 'verified' or 'review_needed'
  const initialStatus = 'verified';

  execute(
    `INSERT INTO resources (
      id, title, author, description, subject, subtopic, difficulty_level,
      publication_year, source_url, license_id, permission_status, uploader_id, version, download_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      data.title.trim(),
      data.author.trim(),
      data.description.trim(),
      data.subject,
      data.subtopic || null,
      data.difficulty_level,
      data.publication_year || null,
      data.source_url.trim(),
      data.license_id,
      initialStatus,
      data.uploader_id,
      data.version || '1.0',
    ]
  );

  return getResourceById(id)!;
}

export function reportResource(data: {
  resourceId: string;
  reporterId: string;
  reason: 'copyright_infringement' | 'misleading_license' | 'broken_link' | 'malware' | 'low_quality';
  details: string;
}): boolean {
  if (!data.details.trim()) {
    throw new Error('Details are required when filing a copyright or quality report');
  }

  const id = `rep_res_${Date.now()}`;
  execute(
    `INSERT INTO resource_reports (id, resource_id, reporter_id, reason, details, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [id, data.resourceId, data.reporterId, data.reason, data.details.trim()]
  );

  return true;
}

export function incrementResourceDownload(resourceId: string): void {
  execute('UPDATE resources SET download_count = download_count + 1 WHERE id = ?', [resourceId]);
}
