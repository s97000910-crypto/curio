import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, getDb, queryOne } from '../src/lib/db/index';
import {
  authenticateUser,
  createAuthSession,
  deleteAuthSession,
  getUserForSessionToken,
  getUserById,
  getUserByUsername,
  registerUser,
  provisionAccountPassword,
  updateUserProfile,
  toggleFollow,
  isFollowing,
  toggleBlock,
  isBlocked,
} from '../src/lib/services/auth';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleReaction,
  votePoll,
  toggleBookmark,
  getSavedPosts,
} from '../src/lib/services/posts';
import { getCommentsForPost, createComment, toggleCommentHelpful, deleteComment } from '../src/lib/services/comments';
import { addLectureNote, getLectureNotes, suggestLecture } from '../src/lib/services/lectures';
import { getCircles, getCircleById, createCircle, toggleCircleMembership, addCircleDiscussion } from '../src/lib/services/circles';
import { getResources, getResourceById, submitResource, reportResource } from '../src/lib/services/library';
import { getInvestigations, getInvestigationById, createInvestigation, addInvestigationRevision } from '../src/lib/services/ideas';
import { createReport, getReportsQueue, takeModeratorAction } from '../src/lib/services/moderation';
import { getUserNotifications, markNotificationRead, getNotificationPreferences, updateNotificationPreferences } from '../src/lib/services/notifications';
import { searchAll } from '../src/lib/services/search';
import {
  deleteUnpublishedVideo,
  getVideoAsset,
  getVideoFilePath,
  saveUploadedVideo,
} from '../src/lib/services/video-assets';
import { stat } from 'node:fs/promises';

// Ensure DB is initialized
getDb();

test('1. Account registration, password sign-in, sessions, and profile management', async () => {
  const uniqueName = `tester_${Date.now()}`;
  const email = `${uniqueName}@curio.test`;
  let userId: string | undefined;
  let sessionToken: string | undefined;
  try {
    const user = await registerUser({
      username: uniqueName,
      display_name: 'Curious Tester',
      email,
      password: 'curious-password-123',
      bio: 'Self-studying mathematical logic',
    });
    userId = user.id;

    assert.equal(user.username, uniqueName);
    assert.equal(user.display_name, 'Curious Tester');
    assert.equal(user.role, 'user');
    assert.equal('password_hash' in user, false);

    const retrieved = getUserByUsername(uniqueName);
    assert.ok(retrieved);
    assert.equal(retrieved.id, user.id);

    const authenticated = await authenticateUser(email.toUpperCase(), 'curious-password-123');
    assert.equal(authenticated.id, user.id);
    await assert.rejects(authenticateUser(email, 'incorrect-password'), /Invalid email or password/);
    await assert.rejects(
      registerUser({
        username: `${uniqueName}_weak`,
        display_name: 'Weak Password',
        email: `${uniqueName}_weak@curio.test`,
        password: 'short',
      }),
      /12 and 128 characters/
    );

    const session = createAuthSession(user.id);
    sessionToken = session.token;
    assert.equal(getUserForSessionToken(session.token)?.id, user.id);
    const storedSession = queryOne<{ token_hash: string }>(
      'SELECT token_hash FROM auth_sessions WHERE user_id = ?',
      [user.id]
    );
    assert.ok(storedSession);
    assert.notEqual(storedSession.token_hash, session.token);
    deleteAuthSession(session.token);
    sessionToken = undefined;
    assert.equal(getUserForSessionToken(session.token), null);

    const updated = updateUserProfile(user.id, {
      bio: 'Updated bio: now reading topology!',
      interests: ['Topology', 'Logic'],
    });
    assert.equal(updated.bio, 'Updated bio: now reading topology!');
    assert.deepEqual(updated.interests, ['Topology', 'Logic']);

    const legacyEmail = `${uniqueName}_legacy@curio.test`;
    const legacyId = `legacy_${uniqueName}`;
    execute(
      'INSERT INTO profiles (id, username, display_name, email) VALUES (?, ?, ?, ?)',
      [legacyId, `${uniqueName}_legacy`, 'Legacy Tester', legacyEmail]
    );
    let legacySessionToken: string | undefined;
    try {
      await assert.rejects(authenticateUser(legacyEmail, 'curious-password-123'), /Invalid email or password/);
      await provisionAccountPassword(legacyEmail, 'legacy-password-123');
      assert.equal((await authenticateUser(legacyEmail, 'legacy-password-123')).email, legacyEmail);

      legacySessionToken = createAuthSession(legacyId).token;
      await provisionAccountPassword(legacyEmail, 'legacy-password-456', true);
      assert.equal(getUserForSessionToken(legacySessionToken), null);
      await assert.rejects(authenticateUser(legacyEmail, 'legacy-password-123'), /Invalid email or password/);
    } finally {
      if (legacySessionToken) deleteAuthSession(legacySessionToken);
      execute('DELETE FROM profiles WHERE id = ?', [legacyId]);
    }
  } finally {
    if (sessionToken) deleteAuthSession(sessionToken);
    if (userId) {
      execute('DELETE FROM notification_preferences WHERE user_id = ?', [userId]);
      execute('DELETE FROM profiles WHERE id = ?', [userId]);
    }
  }
});

test('Lecture notes are only returned to their author', () => {
  const lecture = suggestLecture({
    title: 'Private Notes Test',
    instructor: 'Curio Test',
    institution: 'Independent',
    subject: 'Testing',
    difficulty_level: 'Beginner',
    original_url: 'https://example.org/curio-notes-test',
  });

  try {
    const sophiaNote = addLectureNote({
      lectureId: lecture.id,
      userId: 'user_sophia',
      timestampSecs: 10,
      note: 'Sophia private note',
    });
    const gaussNote = addLectureNote({
      lectureId: lecture.id,
      userId: 'user_gauss',
      timestampSecs: 20,
      note: 'Gauss private note',
    });

    assert.deepEqual(
      getLectureNotes(lecture.id, 'user_sophia').map((note) => note.id),
      [sophiaNote.id]
    );
    assert.deepEqual(
      getLectureNotes(lecture.id, 'user_gauss').map((note) => note.id),
      [gaussNote.id]
    );
    assert.deepEqual(getLectureNotes(lecture.id, 'user_hypatia'), []);
  } finally {
    execute('DELETE FROM lecture_notes WHERE lecture_id = ?', [lecture.id]);
    execute('DELETE FROM lecture_completions WHERE lecture_id = ?', [lecture.id]);
    execute('DELETE FROM lectures WHERE id = ?', [lecture.id]);
  }
});

test('For you feed prioritizes profile topics while Fresh stays chronological', async () => {
  const uniqueName = `feed_${Date.now()}`;
  let userId: string | undefined;
  const postIds: string[] = [];

  try {
    const user = await registerUser({
      username: uniqueName,
      display_name: 'Feed Tester',
      email: `${uniqueName}@curio.test`,
      password: 'curious-password-123',
    });

    userId = user.id;
    updateUserProfile(user.id, { interests: ['Quantum Geometry'], subjects: ['Mathematics'] });

    const mathCommunity = queryOne<{ id: string }>('SELECT id FROM communities WHERE category = ?', ['Mathematics']);
    const artCommunity = queryOne<{ id: string }>('SELECT id FROM communities WHERE category != ?', ['Mathematics']);
    assert.ok(mathCommunity, 'expected a seeded mathematics community');
    assert.ok(artCommunity, 'expected another seeded community');

    const relevantPost = createPost({
      title: 'A fresh quantum geometry question',
      content: 'How can quantum geometry help explain this pattern?',
      post_type: 'question',
      community_id: mathCommunity.id,
      author_id: user.id,
    });
    postIds.push(relevantPost.id);

    const generalPost = createPost({
      title: 'A fresh color theory question',
      content: 'What makes a palette feel balanced?',
      post_type: 'question',
      community_id: artCommunity.id,
      author_id: user.id,
    });
    postIds.push(generalPost.id);
    execute("UPDATE posts SET created_at = datetime('now', '-1 hour') WHERE id = ?", [relevantPost.id]);

    const forYou = getPosts({ filter: 'explore', currentUserId: user.id, limit: 100 });
    const fresh = getPosts({ filter: 'recent', currentUserId: user.id, limit: 100 });
    assert.ok(forYou.findIndex((post) => post.id === relevantPost.id) < forYou.findIndex((post) => post.id === generalPost.id));
    assert.ok(fresh.findIndex((post) => post.id === generalPost.id) < fresh.findIndex((post) => post.id === relevantPost.id));

    const topicResults = getPosts({ topic: 'Quantum Geometry', currentUserId: user.id, limit: 100 });
    assert.ok(topicResults.some((post) => post.id === relevantPost.id));
    assert.ok(!topicResults.some((post) => post.id === generalPost.id));
  } finally {
    if (userId) {
      for (const postId of postIds) deletePost(postId, userId);
      execute('DELETE FROM notification_preferences WHERE user_id = ?', [userId]);
      execute('DELETE FROM profiles WHERE id = ?', [userId]);
    }
  }
});

test('Video uploads validate content, attach to the owner’s post, and clean up safely', async () => {
  const uniqueName = `video_${Date.now()}`;
  let userId: string | undefined;
  let assetId: string | undefined;
  let postId: string | undefined;
  const community = queryOne<{ id: string }>('SELECT id FROM communities LIMIT 1');
  assert.ok(community, 'expected a seeded community');

  try {
    const user = await registerUser({
      username: uniqueName,
      display_name: 'Video Tester',
      email: `${uniqueName}@curio.test`,
      password: 'curious-password-123',
    });
    userId = user.id;

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]));
        controller.close();
      },
    });
    const asset = await saveUploadedVideo(body, 'video/mp4', 12, user.id);
    assetId = asset.asset_id;
    assert.equal((await stat(getVideoFilePath(asset))).size, 12);
    assert.equal(getVideoAsset(asset.asset_id)?.user_id, user.id);
    assert.equal(await deleteUnpublishedVideo(asset.asset_id, 'another-user'), false);

    assert.throws(
      () => createPost({
        title: 'Unauthorized video attachment',
        content: 'This should not be published.',
        post_type: 'discovery',
        community_id: community.id,
        author_id: 'user_gauss',
        video_asset_id: asset.asset_id,
      }),
      /unavailable for this account/
    );

    const post = createPost({
      title: 'A short video',
      content: 'A test video attached to its owner’s post.',
      post_type: 'discovery',
      community_id: community.id,
      author_id: user.id,
      video_asset_id: asset.asset_id,
    });
    postId = post.id;
    assert.equal(post.video_asset_id, asset.asset_id);
    await assert.rejects(
      deleteUnpublishedVideo(asset.asset_id, user.id),
      /already been published/
    );
    assert.equal(deletePost(post.id, user.id), true);
    postId = undefined;
    assert.equal(getVideoAsset(asset.asset_id), null);
    await assert.rejects(stat(getVideoFilePath(asset)), { code: 'ENOENT' });
    assetId = undefined;

    const invalidBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
        controller.close();
      },
    });
    await assert.rejects(
      saveUploadedVideo(invalidBody, 'video/mp4', 8, user.id),
      /contents do not match/
    );
  } finally {
    if (postId && userId) deletePost(postId, userId);
    if (assetId && userId) await deleteUnpublishedVideo(assetId, userId);
    if (userId) {
      execute('DELETE FROM notification_preferences WHERE user_id = ?', [userId]);
      execute('DELETE FROM profiles WHERE id = ?', [userId]);
    }
  }
});

test('Saved posts: newest save first, per-person, paginated, and blocked authors stay hidden', async () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const postIds: string[] = [];
  const makeUser = async (suffix: string) => {
    const user = await registerUser({
      username: `saved_${suffix}_${stamp}`,
      display_name: `Saved ${suffix}`,
      email: `saved_${suffix}_${stamp}@curio.test`,
      password: 'curious-password-123',
    });
    userIds.push(user.id);
    return user;
  };

  try {
    const reader = await makeUser('reader');
    const other = await makeUser('other');
    const author = await makeUser('author');
    const community = queryOne<{ id: string }>('SELECT id FROM communities LIMIT 1');
    assert.ok(community, 'expected a seeded community');

    const makePost = (title: string) => {
      const post = createPost({
        title,
        content: `${title} body`,
        post_type: 'discovery',
        community_id: community.id,
        author_id: author.id,
      });
      postIds.push(post.id);
      return post;
    };
    const first = makePost('Saved first');
    const second = makePost('Saved second');
    const third = makePost('Saved third');

    assert.deepEqual(getSavedPosts(reader.id), { posts: [], hasMore: false });

    // Saved in a known order; identical timestamps must still resolve newest-first.
    for (const post of [first, second, third]) toggleBookmark(reader.id, 'post', post.id);
    execute("UPDATE bookmarks SET created_at = '2026-01-01 10:00:00' WHERE user_id = ?", [reader.id]);

    const all = getSavedPosts(reader.id);
    assert.deepEqual(all.posts.map((post) => post.id), [third.id, second.id, first.id]);
    assert.equal(all.hasMore, false);
    assert.ok(all.posts.every((post) => post.is_bookmarked === true));
    assert.equal(all.posts[0].author_username, author.username);
    assert.ok(all.posts[0].community_name, 'saved posts carry their community');

    // Pagination reports whether more remain, without losing or repeating posts.
    const page1 = getSavedPosts(reader.id, { limit: 2 });
    const page2 = getSavedPosts(reader.id, { limit: 2, offset: 2 });
    assert.deepEqual(page1.posts.map((post) => post.id), [third.id, second.id]);
    assert.equal(page1.hasMore, true);
    assert.deepEqual(page2.posts.map((post) => post.id), [first.id]);
    assert.equal(page2.hasMore, false);

    // Saves are private to the person who made them.
    assert.deepEqual(getSavedPosts(other.id).posts, []);

    // Un-saving removes the post from the list.
    assert.deepEqual(toggleBookmark(reader.id, 'post', second.id), { bookmarked: false });
    assert.deepEqual(getSavedPosts(reader.id).posts.map((post) => post.id), [third.id, first.id]);

    // Bookmarks of other kinds never leak into the post list.
    toggleBookmark(reader.id, 'resource', 'res_euclid');
    assert.equal(getSavedPosts(reader.id).posts.length, 2);

    // Blocking an author hides their saved posts (and unblocking restores them).
    toggleBlock(reader.id, author.id);
    assert.deepEqual(getSavedPosts(reader.id), { posts: [], hasMore: false });
    toggleBlock(reader.id, author.id);
    assert.equal(getSavedPosts(reader.id).posts.length, 2);

    // A deleted post disappears instead of leaving a broken entry.
    deletePost(first.id, author.id);
    assert.deepEqual(getSavedPosts(reader.id).posts.map((post) => post.id), [third.id]);
  } finally {
    for (const postId of postIds) {
      if (queryOne('SELECT 1 FROM posts WHERE id = ?', [postId])) deletePost(postId, userIds[2]);
    }
    for (const userId of userIds) {
      execute('DELETE FROM notification_preferences WHERE user_id = ?', [userId]);
      execute('DELETE FROM profiles WHERE id = ?', [userId]);
    }
  }
});

test('Saving stays reliable when two saves land in the same millisecond', async () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const postIds: string[] = [];
  const realNow = Date.now;
  try {
    const users: NonNullable<ReturnType<typeof getUserById>>[] = [];
    for (const suffix of ['a', 'b']) {
      const user = await registerUser({
        username: `samems_${suffix}_${stamp}`,
        display_name: `Same ms ${suffix}`,
        email: `samems_${suffix}_${stamp}@curio.test`,
        password: 'curious-password-123',
      });
      userIds.push(user.id);
      users.push(user);
    }
    const community = queryOne<{ id: string }>('SELECT id FROM communities LIMIT 1');
    assert.ok(community, 'expected a seeded community');
    const post = createPost({
      title: 'Saved by two people at once',
      content: 'A post two readers save together.',
      post_type: 'discovery',
      community_id: community.id,
      author_id: users[0].id,
    });
    postIds.push(post.id);

    Date.now = () => 1_800_000_000_000;
    assert.doesNotThrow(() => {
      toggleBookmark(users[0].id, 'post', post.id);
      toggleBookmark(users[1].id, 'post', post.id);
    });
    Date.now = realNow;

    assert.equal(getSavedPosts(users[0].id).posts.length, 1);
    assert.equal(getSavedPosts(users[1].id).posts.length, 1);
  } finally {
    Date.now = realNow;
    for (const postId of postIds) deletePost(postId, userIds[0]);
    for (const userId of userIds) {
      execute('DELETE FROM notification_preferences WHERE user_id = ?', [userId]);
      execute('DELETE FROM profiles WHERE id = ?', [userId]);
    }
  }
});

test('2. Social connections: Follow and Block behavior', () => {
  const userA = 'user_sophia';
  const userB = 'user_hypatia';

  // Test Follow
  const res1 = toggleFollow(userA, userB);
  assert.equal(res1.following, true);
  assert.equal(isFollowing(userA, userB), true);

  // Toggle follow off
  const res2 = toggleFollow(userA, userB);
  assert.equal(res2.following, false);
  assert.equal(isFollowing(userA, userB), false);

  // Cannot follow self
  assert.throws(() => toggleFollow(userA, userA), /cannot follow yourself/);

  // Test Block
  const blockRes = toggleBlock(userA, userB);
  assert.equal(blockRes.blocked, true);
  assert.equal(isBlocked(userA, userB), true);

  // Unblock
  const unblockRes = toggleBlock(userA, userB);
  assert.equal(unblockRes.blocked, false);
  assert.equal(isBlocked(userA, userB), false);
});

test('3. Post creation, math notation, editing, and authorization', () => {
  const post = createPost({
    title: 'On the Riemann Hypothesis and Zero Distribution',
    content: 'All non-trivial zeros of $\\zeta(s)$ lie on $\\Re(s) = 1/2$.',
    post_type: 'discovery',
    community_id: 'c_math',
    author_id: 'user_gauss',
    flair: 'Analytic Number Theory',
  });

  assert.ok(post.id);
  assert.equal(post.math_notation, true);
  assert.equal(post.title, 'On the Riemann Hypothesis and Zero Distribution');

  // Edit own post
  const edited = updatePost(post.id, 'user_gauss', {
    title: 'On the Riemann Hypothesis and Critical Line Zeros',
  });
  assert.equal(edited.title, 'On the Riemann Hypothesis and Critical Line Zeros');

  // Unauthorized edit fails
  assert.throws(() => {
    updatePost(post.id, 'user_maya', { title: 'Hacked Title' });
  }, /Unauthorized to edit this post/);

  // Delete post
  const deleted = deletePost(post.id, 'user_gauss');
  assert.equal(deleted, true);
  assert.equal(getPostById(post.id), null);
});

test('4. Reaction uniqueness and counting', () => {
  const post = createPost({
    title: 'Test Post for Reactions',
    content: 'Testing atomic reactions',
    post_type: 'text',
    community_id: 'c_math',
    author_id: 'user_sophia',
  });

  // First reaction adds count
  const r1 = toggleReaction(post.id, 'user_maya', 'eureka');
  assert.equal(r1.reacted, true);
  assert.equal(r1.reaction_count, 1);

  // Toggling same reaction removes it
  const r2 = toggleReaction(post.id, 'user_maya', 'eureka');
  assert.equal(r2.reacted, false);
  assert.equal(r2.reaction_count, 0);

  const like = toggleReaction(post.id, 'user_maya', 'heart');
  assert.equal(like.reacted, true);
  const likeNotification = getUserNotifications('user_sophia').find((notification) =>
    notification.message.includes('liked your post "Test Post for Reactions"')
  );
  assert.ok(likeNotification);
  assert.equal(likeNotification.link, '/c/mathematics');
  markNotificationRead(likeNotification.id, 'user_sophia');

  // Clean up
  deletePost(post.id, 'user_sophia');
});

test('5. Poll creation and voting uniqueness', () => {
  const pollPost = createPost({
    title: 'Which geometry do you prefer?',
    content: 'Euclidean vs Non-Euclidean',
    post_type: 'poll',
    community_id: 'c_math',
    author_id: 'user_gauss',
    poll_question: 'Preferred geometry?',
    poll_options: ['Euclidean (Parallels do not meet)', 'Hyperbolic (Lobachevsky)', 'Elliptic (Riemann)'],
  });

  assert.ok(pollPost.poll);
  assert.equal(pollPost.poll.options.length, 3);
  const firstOption = pollPost.poll.options[0];

  // Vote
  const v1 = votePoll(pollPost.poll.id, firstOption.id, 'user_maya');
  assert.equal(v1.success, true);
  assert.equal(v1.poll.user_voted_option_id, firstOption.id);

  // Duplicate vote fails
  assert.throws(() => {
    votePoll(pollPost.poll!.id, firstOption.id, 'user_maya');
  }, /already voted/);

  deletePost(pollPost.id, 'user_gauss');
});

test('6. Threaded comments and helpful mark', () => {
  const post = createPost({
    title: 'Threaded Discussion Post',
    content: 'Epsilon delta question',
    post_type: 'question',
    community_id: 'c_math',
    author_id: 'user_maya',
  });

  const parentComment = createComment({
    postId: post.id,
    authorId: 'user_gauss',
    content: 'Choose $\\delta = \\min(1, \\varepsilon / (2|c| + 1))$.',
  });

  const replyComment = createComment({
    postId: post.id,
    authorId: 'user_maya',
    content: 'That completely simplifies the bounding factor!',
    parentId: parentComment.id,
  });

  const comments = getCommentsForPost(post.id);
  assert.equal(comments.length, 1);
  assert.equal(comments[0].replies?.length, 1);
  assert.equal(comments[0].replies![0].id, replyComment.id);

  // Mark helpful by post author
  const isHelpful = toggleCommentHelpful(parentComment.id, 'user_maya');
  assert.equal(isHelpful, true);

  // Non-author cannot mark helpful
  assert.throws(() => {
    toggleCommentHelpful(parentComment.id, 'user_ada');
  }, /Only the post author or moderators/);

  deletePost(post.id, 'user_maya');
});

test('7. Private Circle Access Control and Discussions', () => {
  const circle = createCircle({
    name: 'Top Secret Quantum Seminar',
    slug: `private-quantum-${Date.now()}`,
    description: 'Restricted to invited researchers',
    subject: 'Science and technology',
    is_private: true,
    creator_id: 'user_feynman',
  });

  assert.equal(circle.is_private, true);

  // Organizer can access
  const accessOrganizer = getCircleById(circle.id, 'user_feynman');
  assert.ok(accessOrganizer);

  // Non-member access to private circle throws Authorization Error
  assert.throws(() => {
    getCircleById(circle.id, 'user_maya');
  }, /Access denied: this study circle is private/);

  // Unauthenticated access throws Authorization Error
  assert.throws(() => {
    getCircleById(circle.id);
  }, /Access denied: this study circle is private/);
});

test('8. Legal Open Knowledge Library and License Verification', () => {
  // Missing legal confirmation throws error
  assert.throws(() => {
    submitResource({
      title: 'Unauthorized Textbook Scan',
      author: 'Unknown',
      description: 'Test scan without rights',
      subject: 'Mathematics',
      difficulty_level: 'Beginner',
      source_url: 'https://example.com/file.pdf',
      license_id: 'lic_pd',
      uploader_id: 'user_maya',
      legal_confirmation: false,
    });
  }, /must confirm that this resource is legally compliant/);

  // Authorized submission succeeds
  const res = submitResource({
    title: 'Introduction to Category Theory Notes',
    author: 'Emily Riehl',
    description: 'Open course lecture notes on functors and natural transformations',
    subject: 'Mathematics',
    difficulty_level: 'Advanced',
    source_url: 'https://math.jhu.edu/~eriehl/context.pdf',
    license_id: 'lic_cc_by',
    uploader_id: 'user_sophia',
    legal_confirmation: true,
  });

  assert.ok(res.id);
  assert.equal(res.permission_status, 'verified');
  assert.equal(res.license?.code, 'CC BY 4.0');

  // File copyright report
  const reported = reportResource({
    resourceId: res.id,
    reporterId: 'user_maya',
    reason: 'copyright_infringement',
    details: 'Testing copyright review queue trigger',
  });
  assert.equal(reported, true);
});

test('9. Ideas Lab Research Revisions and Citations', () => {
  const idea = createInvestigation({
    title: 'Invariant Subspace Problem in Hilbert Spaces',
    slug: `invariant-subspaces-${Date.now()}`,
    subject: 'Mathematics',
    summary: 'Does every bounded operator on a separable Hilbert space admit a non-trivial closed invariant subspace?',
    hypothesis: 'Counterexamples must exhibit non-quasinilpotent spectral dynamics.',
    proposed_arguments: 'Initial operator construction via bilateral shift weight limits.',
    citations: 'Enflo, P. (1987). On the invariant subspace problem.',
    creator_id: 'user_gauss',
  });

  assert.ok(idea.id);
  assert.equal(idea.revisions?.length, 1);
  assert.equal(idea.revisions![0].version_num, 1);

  // Add revision V2
  const rev2 = addInvestigationRevision(idea.id, 'user_ada', {
    hypothesis: 'Refined hypothesis applying computational limits on compact resolvents.',
    proposed_arguments: 'Spectral spectral theorem decomposition yields lower bounds.',
    citations: 'Read, C. J. (1984). A solution to the invariant subspace problem.',
    change_summary: 'Incorporated Read counterexample comparison and spectral bounds.',
    status: 'under_discussion',
  });

  assert.equal(rev2.version_num, 2);
  const updated = getInvestigationById(idea.id);
  assert.equal(updated?.revisions?.length, 2);
  assert.equal(updated?.status, 'under_discussion');
});

test('10. Moderation Center: Reports, Server-Side Role Enforcement, and Actions', () => {
  // Regular user submits report
  const rep = createReport({
    reporter_id: 'user_maya',
    target_type: 'post',
    target_id: 'post_bell',
    reason: 'spam',
    details: 'Spam test report',
  });
  assert.ok(rep.id);

  // Regular user cannot view moderation queue
  assert.throws(() => {
    getReportsQueue('user_maya');
  }, /Unauthorized: only moderators and administrators/);

  // Moderator can view queue
  const queue = getReportsQueue('user_marcus');
  assert.ok(queue.length >= 1);

  // Moderator takes action
  const actionRes = takeModeratorAction({
    moderatorId: 'user_marcus',
    reportId: rep.id,
    action: 'dismiss_report',
    reason: 'False positive; verified legitimate research update.',
  });
  assert.equal(actionRes.success, true);
});

test('11. Notification Preferences and In-App Delivery', () => {
  const prefs = getNotificationPreferences('user_sophia');
  assert.equal(prefs.in_app_replies, true);

  const updatedPrefs = updateNotificationPreferences('user_sophia', {
    email_notifications: true,
    in_app_mentions: false,
  });
  assert.equal(updatedPrefs.email_notifications, true);
  assert.equal(updatedPrefs.in_app_mentions, false);

  const notifs = getUserNotifications('user_sophia');
  assert.ok(Array.isArray(notifs));
  if (notifs.length > 0) {
    const markRes = markNotificationRead(notifs[0].id, 'user_sophia');
    assert.equal(markRes, true);
  }
});

test('12. Universal Multi-Entity Search', () => {
  const res = searchAll('Euler');
  assert.ok(res.posts.length > 0);
  assert.ok(res.totalCount > 0);

  const resPhysics = searchAll('Quantum');
  assert.ok(resPhysics.totalCount > 0);
});
