import { NextRequest, NextResponse } from 'next/server';
import { toggleReaction } from '@/lib/services/posts';
import type { ReactionType } from '@/lib/db/types';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

function isReactionType(value: string): value is ReactionType {
  return ['heart', 'insightful', 'lightbulb', 'eureka', 'celebrate', 'curious'].includes(value);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const body = await req.json();
    const { reactionType } = body as { reactionType?: string };
    if (!reactionType || !isReactionType(reactionType)) {
      return NextResponse.json({ error: 'A valid reaction type is required' }, { status: 400 });
    }

    const result = toggleReaction(id, currentUserId, reactionType);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update reaction.' },
      { status: getAuthErrorStatus(error, 400) }
    );
  }
}
