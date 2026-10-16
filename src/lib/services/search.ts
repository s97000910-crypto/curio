import { query } from '../db';

export interface SearchResults {
  query: string;
  posts: any[];
  people: any[];
  communities: any[];
  resources: any[];
  lectures: any[];
  circles: any[];
  investigations: any[];
  totalCount: number;
}

export function searchAll(rawQuery: string, limit: number = 8): SearchResults {
  const q = rawQuery.trim();
  if (!q) {
    return {
      query: '',
      posts: [],
      people: [],
      communities: [],
      resources: [],
      lectures: [],
      circles: [],
      investigations: [],
      totalCount: 0,
    };
  }

  const term = `%${q}%`;

  // Search posts
  const posts = query(
    `SELECT p.*, c.name as community_name, c.slug as community_slug, u.display_name as author_name 
     FROM posts p 
     JOIN communities c ON p.community_id = c.id
     JOIN profiles u ON p.author_id = u.id
     WHERE p.title LIKE ? OR p.content LIKE ?
     LIMIT ?`,
    [term, term, limit]
  );

  // Search people
  const people = query(
    `SELECT id, username, display_name, avatar_url, bio, role, reputation_score
     FROM profiles
     WHERE username LIKE ? OR display_name LIKE ? OR bio LIKE ?
     LIMIT ?`,
    [term, term, term, limit]
  );

  // Search communities
  const communities = query(
    `SELECT * FROM communities WHERE name LIKE ? OR description LIKE ? LIMIT ?`,
    [term, term, limit]
  );

  // Search resources
  const resources = query(
    `SELECT r.*, l.name as license_name 
     FROM resources r 
     JOIN resource_licenses l ON r.license_id = l.id
     WHERE r.title LIKE ? OR r.author LIKE ? OR r.description LIKE ?
     LIMIT ?`,
    [term, term, term, limit]
  );

  // Search lectures
  const lectures = query(
    `SELECT * FROM lectures WHERE title LIKE ? OR instructor LIKE ? OR institution LIKE ? LIMIT ?`,
    [term, term, term, limit]
  );

  // Search circles (only public circles in search)
  const circles = query(
    `SELECT * FROM circles WHERE is_private = 0 AND (name LIKE ? OR description LIKE ?) LIMIT ?`,
    [term, term, limit]
  );

  // Search investigations
  const investigations = query(
    `SELECT * FROM investigations WHERE title LIKE ? OR summary LIKE ? LIMIT ?`,
    [term, term, limit]
  );

  const totalCount =
    posts.length +
    people.length +
    communities.length +
    resources.length +
    lectures.length +
    circles.length +
    investigations.length;

  return {
    query: q,
    posts,
    people,
    communities,
    resources,
    lectures,
    circles,
    investigations,
    totalCount,
  };
}
