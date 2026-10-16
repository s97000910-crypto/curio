import { NextRequest, NextResponse } from 'next/server';
import { getCommunityBySlug, toggleCommunityMembership } from '@/lib/services/communities';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const currentUserId = await getCurrentUserId();
    const community = getCommunityBySlug(slug, currentUserId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const result = toggleCommunityMembership(community.id, currentUserId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
