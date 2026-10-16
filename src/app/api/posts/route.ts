import { NextRequest, NextResponse } from 'next/server';
import { getPosts, createPost, FeedOptions } from '@/lib/services/posts';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';
import { PostType } from '@/lib/db/types';

const FEED_FILTERS = ['explore', 'recent', 'following'] as const;
const POST_TYPES: PostType[] = [
  'text',
  'question',
  'discovery',
  'image',
  'meme',
  'poll',
  'resource_rec',
  'research_update',
  'event',
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedFilter = searchParams.get('filter');
    const filter: FeedOptions['filter'] =
      FEED_FILTERS.find((value) => value === requestedFilter) ?? 'explore';
    const communityId = searchParams.get('communityId') || undefined;
    const flair = searchParams.get('flair') || undefined;
    const requestedPostType = searchParams.get('postType');
    const postType = POST_TYPES.find((value) => value === requestedPostType);
    const search = searchParams.get('search') || undefined;
    const topic = searchParams.get('topic') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 25;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    const currentUserId = await getCurrentUserId();
    const posts = getPosts({
      filter,
      communityId,
      flair,
      postType,
      search,
      topic,
      currentUserId,
      limit,
      offset,
    });

    return NextResponse.json({ posts });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load posts' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: 'Please sign in to publish a post' }, { status: 401 });
    }

    const body = await req.json();
    const post = createPost({
      ...body,
      author_id: currentUserId,
    });

    return NextResponse.json({ success: true, post });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create post' },
      { status: getAuthErrorStatus(error, 400) }
    );
  }
}
