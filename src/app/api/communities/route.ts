import { NextRequest, NextResponse } from 'next/server';
import { getCommunities, createCommunity } from '@/lib/services/communities';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const currentUserId = await getCurrentUserId();
    const communities = getCommunities(category, currentUserId);
    return NextResponse.json({ communities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();
    const community = createCommunity({
      ...body,
      creator_id: currentUserId,
    });
    return NextResponse.json({ success: true, community });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
