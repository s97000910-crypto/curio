-- ==============================================================================
-- CURIO — MASTER DATABASE SCHEMA & RLS POLICIES (POSTGRESQL / SUPABASE)
-- Human-Powered Knowledge Ecosystem & Social Network
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    interests JSONB DEFAULT '[]'::jsonb,
    subjects JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '["English"]'::jsonb,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    reputation_score INT DEFAULT 10,
    is_suspended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 2. USER BADGES
CREATE TABLE IF NOT EXISTS user_badges (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_key)
);

-- 3. TOPICS
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMMUNITIES
CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    rules TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    creator_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT FALSE,
    member_count INT DEFAULT 1,
    post_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);

-- 5. COMMUNITY MEMBERSHIPS
CREATE TABLE IF NOT EXISTS community_memberships (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- 6. POSTS
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    post_type TEXT NOT NULL CHECK (post_type IN ('text', 'question', 'discovery', 'image', 'meme', 'poll', 'resource_rec', 'research_update', 'event')),
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    flair TEXT,
    math_notation BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    sticker_code TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    reaction_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_community_id ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);

-- 7. POLLS & VOTES
CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    post_id TEXT UNIQUE NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_options (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    vote_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, user_id)
);

-- 8. COMMENTS (Threaded)
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_helpful BOOLEAN DEFAULT FALSE,
    reaction_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- 9. REACTIONS
CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'insightful', 'lightbulb', 'eureka', 'celebrate', 'curious')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_reaction_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    CONSTRAINT unique_post_reaction UNIQUE (post_id, user_id, reaction_type),
    CONSTRAINT unique_comment_reaction UNIQUE (comment_id, user_id, reaction_type)
);

-- 10. SOCIAL CONNECTIONS (Follows)
CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    follower_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CONSTRAINT check_cannot_follow_self CHECK (follower_id <> following_id)
);

-- 11. USER BLOCKS
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    blocker_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CONSTRAINT check_cannot_block_self CHECK (blocker_id <> blocked_id)
);

-- 12. BOOKMARKS
CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'resource', 'lecture')),
    target_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- 13. RESOURCE LICENSES
CREATE TABLE IF NOT EXISTS resource_licenses (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    can_redistribute BOOLEAN NOT NULL DEFAULT TRUE,
    attribution_required BOOLEAN NOT NULL DEFAULT TRUE,
    commercial_allowed BOOLEAN NOT NULL DEFAULT FALSE
);

-- 14. RESOURCES (Legal Open Knowledge Library)
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT NOT NULL,
    subject TEXT NOT NULL,
    subtopic TEXT,
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', 'Specialized')),
    publication_year INT,
    source_url TEXT NOT NULL,
    file_path TEXT,
    license_id TEXT NOT NULL REFERENCES resource_licenses(id),
    permission_status TEXT NOT NULL DEFAULT 'verified' CHECK (permission_status IN ('verified', 'review_needed', 'rejected')),
    uploader_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    version TEXT DEFAULT '1.0',
    download_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_permission ON resources(permission_status);

-- 15. RESOURCE REPORTS & COPYRIGHT TAKEDOWNS
CREATE TABLE IF NOT EXISTS resource_reports (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    reporter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('copyright_infringement', 'misleading_license', 'broken_link', 'malware', 'low_quality')),
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'taken_down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 16. LECTURES (Curated Video Directory)
CREATE TABLE IF NOT EXISTS lectures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    instructor TEXT NOT NULL,
    institution TEXT NOT NULL,
    subject TEXT NOT NULL,
    subtopic TEXT,
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
    language TEXT NOT NULL DEFAULT 'English',
    duration_mins INT,
    prerequisites TEXT,
    original_url TEXT NOT NULL,
    embed_url TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. LECTURE NOTES & COMPLETIONS
CREATE TABLE IF NOT EXISTS lecture_notes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    timestamp_secs INT DEFAULT 0,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lecture_completions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lecture_id, user_id)
);

-- 18. CIRCLES (Study Groups & Reading Circles)
CREATE TABLE IF NOT EXISTS circles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    subject TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    creator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS circle_members (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS circle_milestones (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS circle_discussions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. IDEAS LAB (Research & Exploration Investigations)
CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'exploring' CHECK (status IN ('exploring', 'seeking_collaborators', 'under_discussion', 'needs_verification', 'resolved', 'archived')),
    creator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation_revisions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    version_num INT NOT NULL,
    hypothesis TEXT NOT NULL,
    proposed_arguments TEXT NOT NULL,
    citations TEXT,
    change_summary TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation_comments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. NOTIFICATIONS & PREFERENCES
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('reply', 'mention', 'circle_invite', 'reaction', 'moderation', 'milestone')),
    message TEXT NOT NULL,
    link TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT FALSE,
    in_app_replies BOOLEAN DEFAULT TRUE,
    in_app_mentions BOOLEAN DEFAULT TRUE,
    in_app_invites BOOLEAN DEFAULT TRUE,
    in_app_reactions BOOLEAN DEFAULT TRUE
);

-- 21. MODERATION & SAFETY
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    reporter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'resource', 'circle')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('harassment', 'spam', 'copyright', 'hate_speech', 'misinformation', 'other')),
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    moderator_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    moderator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('warning', 'remove_content', 'suspend_user', 'ban_user', 'dismiss_report')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE / POSTGRES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can view non-suspended profiles, users can update own profile
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (is_suspended = FALSE OR auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid()::text = id);

-- Posts: Public can view posts
CREATE POLICY "Public posts are viewable by everyone" ON posts
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid()::text = author_id);

CREATE POLICY "Users or moderators can delete posts" ON posts
    FOR DELETE USING (
        auth.uid()::text = author_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('moderator', 'admin'))
    );

-- Private Circles Access Policy
CREATE POLICY "Public circles viewable by all, private only by members" ON circles
    FOR SELECT USING (
        is_private = FALSE OR
        EXISTS (SELECT 1 FROM circle_members WHERE circle_id = circles.id AND user_id = auth.uid()::text)
    );

CREATE POLICY "Circle discussions viewable only by circle members" ON circle_discussions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM circles c
            LEFT JOIN circle_members cm ON cm.circle_id = c.id
            WHERE c.id = circle_discussions.circle_id AND (c.is_private = FALSE OR cm.user_id = auth.uid()::text)
        )
    );

-- Reports: Only reporters can see their reports, and moderators can view all reports
CREATE POLICY "Reporters can view their own reports and moderators view all" ON reports
    FOR SELECT USING (
        reporter_id = auth.uid()::text OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('moderator', 'admin'))
    );
