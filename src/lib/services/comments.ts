import { query, queryOne, execute, transaction } from '../db';
import { Comment } from '../db/types';

export function getCommentsForPost(postId: string, currentUserId?: string): Comment[] {
  const sql = `
    SELECT 
      c.*,
      u.username AS author_username,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar,
      u.role AS author_role
    FROM comments c
    JOIN profiles u ON c.author_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `;

  const rows = query(sql, [postId]);

  // Fetch reactions if user is logged in
  let userReactionsMap: Record<string, string[]> = {};
  if (currentUserId) {
    const reacts = query<{ comment_id: string; reaction_type: string }>(
      'SELECT comment_id, reaction_type FROM reactions WHERE comment_id IS NOT NULL AND user_id = ?',
      [currentUserId]
    );
    for (const r of reacts) {
      if (!userReactionsMap[r.comment_id]) {
        userReactionsMap[r.comment_id] = [];
      }
      userReactionsMap[r.comment_id].push(r.reaction_type);
    }
  }

  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  for (const row of rows) {
    const comment: Comment = {
      ...row,
      is_helpful: Boolean(row.is_helpful),
      user_reactions: userReactionsMap[row.id] || [],
      replies: [],
    };
    commentMap.set(comment.id, comment);
  }

  for (const comment of commentMap.values()) {
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      commentMap.get(comment.parent_id)!.replies!.push(comment);
    } else {
      rootComments.push(comment);
    }
  }

  return rootComments;
}

export function createComment(data: {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
}): Comment {
  if (!data.content.trim()) {
    throw new Error('Comment content cannot be empty');
  }

  const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  return transaction((db) => {
    db.prepare(`
      INSERT INTO comments (id, post_id, author_id, parent_id, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(commentId, data.postId, data.authorId, data.parentId || null, data.content.trim());

    // Increment post comment_count
    db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(data.postId);

    // Notify post author or parent comment author
    const author = db.prepare('SELECT display_name, username FROM profiles WHERE id = ?').get(data.authorId) as {
      display_name: string;
      username: string;
    };

    if (data.parentId) {
      const parent = db.prepare('SELECT author_id FROM comments WHERE id = ?').get(data.parentId) as {
        author_id: string;
      };
      if (parent && parent.author_id !== data.authorId) {
        db.prepare(
          'INSERT INTO notifications (id, user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          parent.author_id,
          data.authorId,
          'reply',
          `${author.display_name} replied to your comment.`,
          `/c/mathematics`
        );
      }
    } else {
      const post = db.prepare('SELECT author_id, title FROM posts WHERE id = ?').get(data.postId) as {
        author_id: string;
        title: string;
      };
      if (post && post.author_id !== data.authorId) {
        db.prepare(
          'INSERT INTO notifications (id, user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          post.author_id,
          data.authorId,
          'reply',
          `${author.display_name} commented on your post "${post.title.substring(0, 35)}..."`,
          `/c/mathematics`
        );
      }
    }

    const row = db.prepare(`
      SELECT 
        c.*,
        u.username AS author_username,
        u.display_name AS author_name,
        u.avatar_url AS author_avatar,
        u.role AS author_role
      FROM comments c
      JOIN profiles u ON c.author_id = u.id
      WHERE c.id = ?
    `).get(commentId) as any;

    return {
      ...row,
      is_helpful: false,
      user_reactions: [],
      replies: [],
    };
  });
}

export function toggleCommentHelpful(commentId: string, userId: string): boolean {
  const comment = queryOne<{ post_id: string; is_helpful: number }>('SELECT post_id, is_helpful FROM comments WHERE id = ?', [commentId]);
  if (!comment) throw new Error('Comment not found');

  const post = queryOne<{ author_id: string }>('SELECT author_id FROM posts WHERE id = ?', [comment.post_id]);
  const user = queryOne<{ role: string }>('SELECT role FROM profiles WHERE id = ?', [userId]);

  const isPostAuthor = post && post.author_id === userId;
  const isStaff = user && (user.role === 'moderator' || user.role === 'admin');

  if (!isPostAuthor && !isStaff) {
    throw new Error('Only the post author or moderators can mark an answer as helpful');
  }

  const newState = comment.is_helpful ? 0 : 1;
  execute('UPDATE comments SET is_helpful = ? WHERE id = ?', [newState, commentId]);

  // Give reputation boost to comment author if marked helpful
  if (newState === 1) {
    execute(`
      UPDATE profiles 
      SET reputation_score = reputation_score + 15 
      WHERE id = (SELECT author_id FROM comments WHERE id = ?)
    `, [commentId]);
  }

  return Boolean(newState);
}

export function deleteComment(commentId: string, userId: string): boolean {
  const comment = queryOne<{ post_id: string; author_id: string }>('SELECT post_id, author_id FROM comments WHERE id = ?', [commentId]);
  if (!comment) throw new Error('Comment not found');

  const user = queryOne<{ role: string }>('SELECT role FROM profiles WHERE id = ?', [userId]);
  const isAuthor = comment.author_id === userId;
  const isStaff = user && (user.role === 'moderator' || user.role === 'admin');

  if (!isAuthor && !isStaff) {
    throw new Error('Unauthorized to delete this comment');
  }

  return transaction((db) => {
    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    db.prepare('UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?').run(comment.post_id);
    return true;
  });
}
