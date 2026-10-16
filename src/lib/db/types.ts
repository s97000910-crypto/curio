export type UserRole = 'user' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  interests: string[];
  subjects: string[];
  languages: string[];
  role: UserRole;
  reputation_score: number;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_key: string;
  title: string;
  category: string;
  description: string;
  earned_at: string;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  rules: string;
  category: string;
  icon: string;
  color: string;
  image_url?: string | null;
  creator_id?: string;
  is_private: boolean;
  member_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
  is_member?: boolean;
  can_manage_image?: boolean;
}

export type PostType =
  | 'text'
  | 'question'
  | 'discovery'
  | 'image'
  | 'meme'
  | 'poll'
  | 'resource_rec'
  | 'research_update'
  | 'event';

export interface Post {
  id: string;
  title: string;
  content: string;
  post_type: PostType;
  community_id: string;
  community_name?: string;
  community_slug?: string;
  community_color?: string;
  author_id: string;
  author_username?: string;
  author_name?: string;
  author_avatar?: string;
  author_role?: UserRole;
  flair?: string;
  math_notation: boolean;
  image_url?: string;
  video_asset_id?: string | null;
  sticker_code?: string;
  is_pinned: boolean;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  user_reactions?: string[];
  is_bookmarked?: boolean;
  poll?: PollWithDetails;
}

export interface Poll {
  id: string;
  post_id: string;
  question: string;
  ends_at?: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  vote_count: number;
}

export interface PollWithDetails extends Poll {
  options: PollOption[];
  user_voted_option_id?: string;
  total_votes: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username?: string;
  author_name?: string;
  author_avatar?: string;
  author_role?: UserRole;
  parent_id?: string;
  content: string;
  is_helpful: boolean;
  reaction_count: number;
  created_at: string;
  updated_at: string;
  user_reactions?: string[];
  replies?: Comment[];
}

export type ReactionType = 'heart' | 'insightful' | 'lightbulb' | 'eureka' | 'celebrate' | 'curious';

export interface Reaction {
  id: string;
  post_id?: string;
  comment_id?: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  target_type: 'post' | 'resource' | 'lecture';
  target_id: string;
  created_at: string;
}

export interface ResourceLicense {
  id: string;
  code: string;
  name: string;
  url: string;
  can_redistribute: boolean;
  attribution_required: boolean;
  commercial_allowed: boolean;
}

export interface Resource {
  id: string;
  title: string;
  author: string;
  description: string;
  subject: string;
  subtopic?: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Specialized';
  publication_year?: number;
  source_url: string;
  file_path?: string;
  license_id: string;
  license?: ResourceLicense;
  permission_status: 'verified' | 'review_needed' | 'rejected';
  uploader_id: string;
  uploader_name?: string;
  version: string;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface ResourceReport {
  id: string;
  resource_id: string;
  reporter_id: string;
  reporter_name?: string;
  reason: 'copyright_infringement' | 'misleading_license' | 'broken_link' | 'malware' | 'low_quality';
  details: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'taken_down';
  created_at: string;
}

export interface Lecture {
  id: string;
  title: string;
  instructor: string;
  institution: string;
  subject: string;
  subtopic?: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  duration_mins?: number;
  prerequisites?: string;
  original_url: string;
  embed_url?: string;
  status: 'published' | 'pending_review';
  created_at: string;
  is_completed?: boolean;
}

export interface LectureNote {
  id: string;
  lecture_id: string;
  user_id: string;
  user_name?: string;
  timestamp_secs: number;
  note: string;
  created_at: string;
}

export interface Circle {
  id: string;
  name: string;
  slug: string;
  description: string;
  subject: string;
  is_private: boolean;
  creator_id: string;
  creator_name?: string;
  status: 'active' | 'archived';
  member_count?: number;
  is_member?: boolean;
  role?: 'organizer' | 'member';
  created_at: string;
  updated_at: string;
}

export interface CircleMilestone {
  id: string;
  circle_id: string;
  title: string;
  description?: string;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
}

export interface CircleDiscussion {
  id: string;
  circle_id: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  title: string;
  content: string;
  created_at: string;
}

export type InvestigationStatus =
  | 'exploring'
  | 'seeking_collaborators'
  | 'under_discussion'
  | 'needs_verification'
  | 'resolved'
  | 'archived';

export interface Investigation {
  id: string;
  title: string;
  slug: string;
  subject: string;
  summary: string;
  status: InvestigationStatus;
  creator_id: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  revisions?: InvestigationRevision[];
}

export interface InvestigationRevision {
  id: string;
  investigation_id: string;
  author_id: string;
  author_name?: string;
  version_num: number;
  hypothesis: string;
  proposed_arguments: string;
  citations?: string;
  change_summary: string;
  created_at: string;
}

export interface InvestigationComment {
  id: string;
  investigation_id: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export type NotificationType = 'reply' | 'mention' | 'circle_invite' | 'reaction' | 'moderation' | 'milestone';

export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  type: NotificationType;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  in_app_replies: boolean;
  in_app_mentions: boolean;
  in_app_invites: boolean;
  in_app_reactions: boolean;
}

export interface Report {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  target_type: 'post' | 'comment' | 'user' | 'resource' | 'circle';
  target_id: string;
  reason: 'harassment' | 'spam' | 'copyright' | 'hate_speech' | 'misinformation' | 'other';
  details: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  moderator_id?: string;
  moderator_name?: string;
  action_taken?: string;
  created_at: string;
  resolved_at?: string;
}

export interface ModerationAction {
  id: string;
  moderator_id: string;
  moderator_name?: string;
  target_type: string;
  target_id: string;
  action: 'warning' | 'remove_content' | 'suspend_user' | 'ban_user' | 'dismiss_report';
  reason: string;
  created_at: string;
}
