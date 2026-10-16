import { query, queryOne, execute, transaction } from '../db';
import { Post, PostType, ReactionType, PollWithDetails, PollOption } from '../db/types';
import type { SQLInputValue } from 'node:sqlite';
import { deleteVideoFile } from './video-assets';

type RawPost = Omit<Post, 'math_notation' | 'is_pinned'> & {
  math_notation: boolean | number;
  is_pinned: boolean | number;
};

export interface FeedOptions {
  filter?: 'explore' | 'recent' | 'following';
  communityId?: string;
  flair?: string;
  postType?: PostType;
  search?: string;
  topic?: string;
  currentUserId?: string;
  limit?: number;
  offset?: number;
}

export function getPosts(options: FeedOptions = {}): Post[] {
  const {
    filter = 'explore',
    communityId,
    flair,
    postType,
    search,
    topic,
    currentUserId,
    limit = 20,
    offset = 0,
  } = options;

  const whereClauses: string[] = ['1=1'];
  const params: SQLInputValue[] = [];

  // Exclude blocked users if currentUserId is provided
  if (currentUserId) {
    whereClauses.push(`p.author_id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = ?
      UNION
      SELECT blocker_id FROM blocks WHERE blocked_id = ?
    )`);
    params.push(currentUserId, currentUserId);
  }

  if (communityId) {
    whereClauses.push('p.community_id = ?');
    params.push(communityId);
  }

  if (flair) {
    whereClauses.push('p.flair = ?');
    params.push(flair);
  }

  if (postType) {
    whereClauses.push('p.post_type = ?');
    params.push(postType);
  }

  if (search && search.trim()) {
    whereClauses.push('(p.title LIKE ? OR p.content LIKE ? OR c.name LIKE ? OR c.category LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (topic && topic.trim()) {
    whereClauses.push('(p.title LIKE ? OR p.content LIKE ? OR c.name LIKE ? OR c.category LIKE ? OR p.flair LIKE ?)');
    const term = `%${topic.trim()}%`;
    params.push(term, term, term, term, term);
  }

  if (filter === 'following' && currentUserId) {
    whereClauses.push('p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ?)');
    params.push(currentUserId);
  }

  // Deterministic Ranking without ML/AI:
  // Explore: pinned posts first, then profile-topic matches, freshness, and conversation.
  let orderBy = 'p.is_pinned DESC, p.created_at DESC';
  if (filter === 'explore') {
    const topicTerms = getFeedTopics(currentUserId);
    let topicScore = '0';
    if (topicTerms.length > 0) {
      topicScore = topicTerms
        .map(
          () => `(CASE WHEN
            lower(c.name) LIKE ? ESCAPE '\\'
            OR lower(c.category) LIKE ? ESCAPE '\\'
            OR lower(COALESCE(p.flair, '')) LIKE ? ESCAPE '\\'
            OR lower(p.title) LIKE ? ESCAPE '\\'
            OR lower(p.content) LIKE ? ESCAPE '\\'
          THEN 1 ELSE 0 END)`
        )
        .join(' + ');
      for (const term of topicTerms) {
        const pattern = `%${escapeLikeTerm(term)}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
      }
    }
    orderBy = `
      p.is_pinned DESC,
      ((${topicScore}) * 2.5 +
       ((p.reaction_count * 0.5 + p.comment_count * 0.75) /
        MAX(1.0, ((julianday('now') - julianday(p.created_at)) * 24.0 + 2.0)))) DESC,
      p.created_at DESC
    `;
  } else if (filter === 'recent' || filter === 'following') {
    orderBy = 'p.is_pinned DESC, p.created_at DESC';
  }

  const sql = `
    SELECT 
      p.*,
      c.name AS community_name,
      c.slug AS community_slug,
      c.color AS community_color,
      u.username AS author_username,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar,
      u.role AS author_role
    FROM posts p
    JOIN communities c ON p.community_id = c.id
    JOIN profiles u ON p.author_id = u.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  const rows = query<RawPost>(sql, params);

  return rows.map((post) => hydratePost(post, currentUserId));
}

function getFeedTopics(userId?: string): string[] {
  if (!userId) return [];

  const profile = queryOne<{ interests: string | null; subjects: string | null }>(
    'SELECT interests, subjects FROM profiles WHERE id = ?',
    [userId]
  );
  if (!profile) return [];

  const parseTopics = (value: string | null): string[] => {
    if (!value) return [];
    const topics: unknown = JSON.parse(value);
    return Array.isArray(topics) ? topics.filter((topic): topic is string => typeof topic === 'string') : [];
  };

  return [...new Set([...parseTopics(profile.interests), ...parseTopics(profile.subjects)]
    .map((topic) => topic.trim().toLocaleLowerCase())
    .filter(Boolean))]
    .slice(0, 20);
}

function escapeLikeTerm(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function hydratePost(post: RawPost, currentUserId?: string): Post {
  // Fetch user reactions for this post
  let userReactions: string[] = [];
  let isBookmarked = false;

  if (currentUserId) {
    const reacts = query<{ reaction_type: string }>(
      'SELECT reaction_type FROM reactions WHERE post_id = ? AND user_id = ?',
      [post.id, currentUserId]
    );
    userReactions = reacts.map((r) => r.reaction_type);

    const bm = queryOne(
      "SELECT 1 FROM bookmarks WHERE user_id = ? AND target_type = 'post' AND target_id = ?",
      [currentUserId, post.id]
    );
    isBookmarked = Boolean(bm);
  }

  // Fetch poll if applicable
  let poll: PollWithDetails | undefined = undefined;
  if (post.post_type === 'poll') {
    poll = getPollForPost(post.id, currentUserId);
  }

  return {
    ...post,
    math_notation: Boolean(post.math_notation),
    is_pinned: Boolean(post.is_pinned),
    user_reactions: userReactions,
    is_bookmarked: isBookmarked,
    poll,
  };
}

export function getPostById(id: string, currentUserId?: string): Post | null {
  const sql = `
    SELECT 
      p.*,
      c.name AS community_name,
      c.slug AS community_slug,
      c.color AS community_color,
      u.username AS author_username,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar,
      u.role AS author_role
    FROM posts p
    JOIN communities c ON p.community_id = c.id
    JOIN profiles u ON p.author_id = u.id
    WHERE p.id = ?
  `;

  const raw = queryOne<RawPost>(sql, [id]);
  if (!raw) return null;
  return hydratePost(raw, currentUserId);
}

const SAVED_PAGE_SIZE = 20;
const SAVED_MAX_PAGE_SIZE = 50;

/**
 * Posts the person has saved, most recently saved first. Posts from authors in
 * either direction of a block are hidden, matching the main feed, and posts
 * that no longer exist simply drop out of the list.
 */
export function getSavedPosts(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): { posts: Post[]; hasMore: boolean } {
  const requestedLimit = Number.isFinite(options.limit) ? Math.floor(options.limit as number) : SAVED_PAGE_SIZE;
  const limit = Math.min(SAVED_MAX_PAGE_SIZE, Math.max(1, requestedLimit));
  const requestedOffset = Number.isFinite(options.offset) ? Math.floor(options.offset as number) : 0;
  const offset = Math.max(0, requestedOffset);

  // Ask for one extra row so we know whether another page exists.
  const rows = query<RawPost>(
    `
    SELECT
      p.*,
      c.name AS community_name,
      c.slug AS community_slug,
      c.color AS community_color,
      u.username AS author_username,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar,
      u.role AS author_role
    FROM bookmarks b
    JOIN posts p ON p.id = b.target_id
    JOIN communities c ON p.community_id = c.id
    JOIN profiles u ON p.author_id = u.id
    WHERE b.user_id = ?
      AND b.target_type = 'post'
      AND p.author_id NOT IN (
        SELECT blocked_id FROM blocks WHERE blocker_id = ?
        UNION
        SELECT blocker_id FROM blocks WHERE blocked_id = ?
      )
    ORDER BY b.created_at DESC, b.rowid DESC
    LIMIT ? OFFSET ?
  `,
    [userId, userId, userId, limit + 1, offset]
  );

  return {
    posts: rows.slice(0, limit).map((post) => hydratePost(post, userId)),
    hasMore: rows.length > limit,
  };
}

export function getPollForPost(postId: string, currentUserId?: string): PollWithDetails | undefined {
  const pollRaw = queryOne('SELECT * FROM polls WHERE post_id = ?', [postId]);
  if (!pollRaw) return undefined;

  const options = query<PollOption>('SELECT * FROM poll_options WHERE poll_id = ?', [pollRaw.id]);
  let userVotedOptionId: string | undefined = undefined;
  if (currentUserId) {
    const vote = queryOne<{ option_id: string }>(
      'SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?',
      [pollRaw.id, currentUserId]
    );
    if (vote) userVotedOptionId = vote.option_id;
  }

  const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

  return {
    ...pollRaw,
    options,
    user_voted_option_id: userVotedOptionId,
    total_votes: totalVotes,
  };
}

export function createPost(data: {
  title: string;
  content: string;
  post_type: PostType;
  community_id: string;
  author_id: string;
  flair?: string;
  math_notation?: boolean;
  image_url?: string;
  video_asset_id?: string;
  sticker_code?: string;
  poll_question?: string;
  poll_options?: string[];
}): Post {
  if (!data.title.trim() || !data.content.trim()) {
    throw new Error('Title and content are required');
  }

  const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const hasMath = Boolean(data.math_notation || data.content.includes('$'));

  return transaction((db) => {
    if (data.video_asset_id) {
      const asset = db
        .prepare('SELECT user_id FROM video_assets WHERE asset_id = ?')
        .get(data.video_asset_id) as { user_id: string } | undefined;
      if (!asset || asset.user_id !== data.author_id) {
        throw new Error('That video upload is unavailable for this account');
      }
      if (db.prepare('SELECT 1 FROM posts WHERE video_asset_id = ?').get(data.video_asset_id)) {
        throw new Error('That video has already been published');
      }
    }

    // Insert post
    const postStmt = db.prepare(`
      INSERT INTO posts (id, title, content, post_type, community_id, author_id, flair, math_notation, image_url, video_asset_id, sticker_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    postStmt.run(
      postId,
      data.title.trim(),
      data.content.trim(),
      data.post_type,
      data.community_id,
      data.author_id,
      data.flair || null,
      hasMath ? 1 : 0,
      data.image_url || null,
      data.video_asset_id || null,
      data.sticker_code || null
    );

    // Update community post_count
    db.prepare('UPDATE communities SET post_count = post_count + 1 WHERE id = ?').run(data.community_id);

    // Handle Poll creation if needed
    if (data.post_type === 'poll' && data.poll_options && data.poll_options.length >= 2) {
      const pollId = `poll_${postId}`;
      db.prepare('INSERT INTO polls (id, post_id, question) VALUES (?, ?, ?)').run(
        pollId,
        postId,
        data.poll_question || data.title
      );

      const optStmt = db.prepare('INSERT INTO poll_options (id, poll_id, text, vote_count) VALUES (?, ?, ?, 0)');
      for (let i = 0; i < data.poll_options.length; i++) {
        const text = data.poll_options[i].trim();
        if (text) {
          optStmt.run(`opt_${pollId}_${i}`, pollId, text);
        }
      }
    }

    return getPostById(postId, data.author_id)!;
  });
}

export function updatePost(
  id: string,
  userId: string,
  data: { title?: string; content?: string; flair?: string }
): Post {
  const post = getPostById(id);
  if (!post) throw new Error('Post not found');
  if (post.author_id !== userId) {
    // Check if user is moderator/admin
    const user = queryOne('SELECT role FROM profiles WHERE id = ?', [userId]);
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      throw new Error('Unauthorized to edit this post');
    }
  }

  const title = data.title ? data.title.trim() : post.title;
  const content = data.content ? data.content.trim() : post.content;
  const flair = data.flair !== undefined ? data.flair : post.flair;
  const hasMath = Boolean(content.includes('$'));

  execute(
    `UPDATE posts SET title = ?, content = ?, flair = ?, math_notation = ?, updated_at = datetime('now') WHERE id = ?`,
    [title, content, flair, hasMath ? 1 : 0, id]
  );

  return getPostById(id, userId)!;
}

export function deletePost(id: string, userId: string): boolean {
  const post = getPostById(id);
  if (!post) throw new Error('Post not found');

  const user = queryOne('SELECT role FROM profiles WHERE id = ?', [userId]);
  const isAuthor = post.author_id === userId;
  const isStaff = user && (user.role === 'moderator' || user.role === 'admin');
  const videoAssetId = post.video_asset_id;

  if (!isAuthor && !isStaff) {
    throw new Error('Unauthorized to delete this post');
  }

  transaction((db) => {
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    db.prepare('UPDATE communities SET post_count = MAX(0, post_count - 1) WHERE id = ?').run(post.community_id);
  });

  if (videoAssetId) deleteVideoFile(videoAssetId);
  return true;
}

export function toggleReaction(
  postId: string,
  userId: string,
  reactionType: ReactionType
): { reacted: boolean; reaction_count: number } {
  return transaction((db) => {
    const existing = db
      .prepare('SELECT id FROM reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?')
      .get(postId, userId, reactionType);

    if (existing) {
      // Remove reaction
      db.prepare('DELETE FROM reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?').run(
        postId,
        userId,
        reactionType
      );
      db.prepare('UPDATE posts SET reaction_count = MAX(0, reaction_count - 1) WHERE id = ?').run(postId);
      const updated = db.prepare('SELECT reaction_count FROM posts WHERE id = ?').get(postId) as {
        reaction_count: number;
      };
      return { reacted: false, reaction_count: updated.reaction_count };
    } else {
      // Add reaction
      const id = `react_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.prepare('INSERT INTO reactions (id, post_id, user_id, reaction_type) VALUES (?, ?, ?, ?)').run(
        id,
        postId,
        userId,
        reactionType
      );
      db.prepare('UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = ?').run(postId);

      // Notify post author
      const post = db.prepare(`
        SELECT posts.author_id, posts.title, communities.slug AS community_slug
        FROM posts
        JOIN communities ON communities.id = posts.community_id
        WHERE posts.id = ?
      `).get(postId) as {
        author_id: string;
        title: string;
        community_slug: string;
      };
      const notificationPreferences = post && post.author_id !== userId
        ? db.prepare('SELECT in_app_reactions FROM notification_preferences WHERE user_id = ?')
            .get(post.author_id) as { in_app_reactions: number } | undefined
        : undefined;
      if (post && post.author_id !== userId && notificationPreferences?.in_app_reactions !== 0) {
        const reactor = db.prepare('SELECT display_name FROM profiles WHERE id = ?').get(userId) as {
          display_name: string;
        };
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        db.prepare(
          'INSERT INTO notifications (id, user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          notifId,
          post.author_id,
          userId,
          'reaction',
          reactionType === 'heart'
            ? `${reactor.display_name} liked your post "${post.title.substring(0, 40)}${post.title.length > 40 ? '…' : ''}"`
            : `${reactor.display_name} reacted with :${reactionType}: to your post "${post.title.substring(0, 40)}${post.title.length > 40 ? '…' : ''}"`,
          `/c/${post.community_slug}`
        );
      }

      const updated = db.prepare('SELECT reaction_count FROM posts WHERE id = ?').get(postId) as {
        reaction_count: number;
      };
      return { reacted: true, reaction_count: updated.reaction_count };
    }
  });
}

export function votePoll(
  pollId: string,
  optionId: string,
  userId: string
): { success: boolean; poll: PollWithDetails } {
  return transaction((db) => {
    const existing = db.prepare('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, userId);
    if (existing) {
      throw new Error('You have already voted in this poll');
    }

    const voteId = `vote_${Date.now()}`;
    db.prepare('INSERT INTO poll_votes (id, poll_id, option_id, user_id) VALUES (?, ?, ?, ?)').run(
      voteId,
      pollId,
      optionId,
      userId
    );
    db.prepare('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?').run(optionId);

    const poll = db.prepare('SELECT post_id FROM polls WHERE id = ?').get(pollId) as { post_id: string };
    const details = getPollForPost(poll.post_id, userId)!;
    return { success: true, poll: details };
  });
}

export function toggleBookmark(
  userId: string,
  targetType: 'post' | 'resource' | 'lecture',
  targetId: string
): { bookmarked: boolean } {
  const existing = queryOne(
    'SELECT id FROM bookmarks WHERE user_id = ? AND target_type = ? AND target_id = ?',
    [userId, targetType, targetId]
  );

  if (existing) {
    execute('DELETE FROM bookmarks WHERE user_id = ? AND target_type = ? AND target_id = ?', [
      userId,
      targetType,
      targetId,
    ]);
    return { bookmarked: false };
  } else {
    const id = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    execute('INSERT INTO bookmarks (id, user_id, target_type, target_id) VALUES (?, ?, ?, ?)', [
      id,
      userId,
      targetType,
      targetId,
    ]);
    return { bookmarked: true };
  }
}
