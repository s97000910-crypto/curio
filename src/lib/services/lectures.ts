import { randomUUID } from 'node:crypto';
import { query, queryOne, execute, transaction } from '../db';
import { Lecture, LectureNote } from '../db/types';

export interface LectureFilterOptions {
  subject?: string;
  difficulty?: string;
  search?: string;
  currentUserId?: string;
  limit?: number;
  offset?: number;
}

export function getLectures(options: LectureFilterOptions = {}): Lecture[] {
  const { subject, difficulty, search, currentUserId, limit = 20, offset = 0 } = options;

  let whereClauses: string[] = ["l.status = 'published'"];
  const params: any[] = [];

  if (subject && subject !== 'All') {
    whereClauses.push('l.subject = ?');
    params.push(subject);
  }

  if (difficulty && difficulty !== 'All') {
    whereClauses.push('l.difficulty_level = ?');
    params.push(difficulty);
  }

  if (search && search.trim()) {
    whereClauses.push('(l.title LIKE ? OR l.instructor LIKE ? OR l.institution LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const sql = `
    SELECT l.*
    FROM lectures l
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  const rows = query<Lecture>(sql, params);

  return rows.map((lec) => hydrateLecture(lec, currentUserId));
}

export function getLectureById(id: string, currentUserId?: string): Lecture | null {
  const raw = queryOne<Lecture>('SELECT * FROM lectures WHERE id = ?', [id]);
  if (!raw) return null;
  return hydrateLecture(raw, currentUserId);
}

function hydrateLecture(lecture: any, currentUserId?: string): Lecture {
  let isCompleted = false;
  if (currentUserId) {
    const comp = queryOne('SELECT 1 FROM lecture_completions WHERE lecture_id = ? AND user_id = ?', [
      lecture.id,
      currentUserId,
    ]);
    isCompleted = Boolean(comp);
  }

  return {
    ...lecture,
    is_completed: isCompleted,
  };
}

export function getLectureNotes(lectureId: string, userId: string): LectureNote[] {
  const sql = `
    SELECT 
      n.*,
      u.display_name AS user_name
    FROM lecture_notes n
    JOIN profiles u ON n.user_id = u.id
    WHERE n.lecture_id = ? AND n.user_id = ?
    ORDER BY n.timestamp_secs ASC
  `;
  return query<LectureNote>(sql, [lectureId, userId]);
}

export function addLectureNote(data: {
  lectureId: string;
  userId: string;
  timestampSecs: number;
  note: string;
}): LectureNote {
  if (!data.note.trim()) {
    throw new Error('Note text cannot be empty');
  }

  const id = `ln_${randomUUID()}`;
  execute(
    'INSERT INTO lecture_notes (id, lecture_id, user_id, timestamp_secs, note) VALUES (?, ?, ?, ?, ?)',
    [id, data.lectureId, data.userId, Math.max(0, data.timestampSecs), data.note.trim()]
  );

  return queryOne<LectureNote>(
    `SELECT n.*, u.display_name as user_name 
     FROM lecture_notes n JOIN profiles u ON n.user_id = u.id WHERE n.id = ?`,
    [id]
  )!;
}

export function toggleLectureCompletion(lectureId: string, userId: string): { completed: boolean } {
  const existing = queryOne(
    'SELECT id FROM lecture_completions WHERE lecture_id = ? AND user_id = ?',
    [lectureId, userId]
  );

  if (existing) {
    execute('DELETE FROM lecture_completions WHERE lecture_id = ? AND user_id = ?', [lectureId, userId]);
    return { completed: false };
  } else {
    execute('INSERT INTO lecture_completions (id, lecture_id, user_id) VALUES (?, ?, ?)', [
      `lc_${Date.now()}`,
      lectureId,
      userId,
    ]);
    return { completed: true };
  }
}

export function suggestLecture(data: {
  title: string;
  instructor: string;
  institution: string;
  subject: string;
  subtopic?: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration_mins?: number;
  original_url: string;
}): Lecture {
  if (!data.title.trim() || !data.instructor.trim() || !data.original_url.trim()) {
    throw new Error('Title, Instructor, and original URL are required');
  }

  // Derive standard embed URL if it's YouTube
  let embedUrl: string | null = null;
  try {
    const parsed = new URL(data.original_url);
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      const v = parsed.searchParams.get('v') || parsed.pathname.slice(1);
      if (v) {
        embedUrl = `https://www.youtube-nocookie.com/embed/${v}`;
      }
    }
  } catch {
    // Keep embedUrl null if invalid
  }

  const id = `lec_${Date.now()}`;
  execute(
    `INSERT INTO lectures (
      id, title, instructor, institution, subject, subtopic, difficulty_level,
      language, duration_mins, original_url, embed_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'English', ?, ?, ?, 'published')`,
    [
      id,
      data.title.trim(),
      data.instructor.trim(),
      data.institution.trim() || 'Independent',
      data.subject,
      data.subtopic || null,
      data.difficulty_level,
      data.duration_mins || null,
      data.original_url.trim(),
      embedUrl,
    ]
  );

  return getLectureById(id)!;
}
