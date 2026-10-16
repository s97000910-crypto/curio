import { NextRequest, NextResponse } from 'next/server';
import { getSavedPosts } from '@/lib/services/posts';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

function readInteger(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const { searchParams } = new URL(req.url);
    const result = getSavedPosts(currentUserId, {
      limit: readInteger(searchParams.get('limit')),
      offset: readInteger(searchParams.get('offset')),
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load saved posts' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}
