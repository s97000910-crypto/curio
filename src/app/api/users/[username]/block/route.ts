import { NextRequest, NextResponse } from 'next/server';
import { getAuthErrorStatus, getUserByUsername, toggleBlock, getCurrentUserId } from '@/lib/services/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const currentUserId = await getCurrentUserId();
    const targetUser = getUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = toggleBlock(currentUserId, targetUser.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
