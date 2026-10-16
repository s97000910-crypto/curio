import { NextRequest, NextResponse } from 'next/server';
import { getCircleMilestones, addMilestone, toggleMilestone } from '@/lib/services/circles';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const milestones = getCircleMilestones(id);
    return NextResponse.json({ milestones });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    if (body.action === 'toggle') {
      toggleMilestone(body.milestoneId, body.isCompleted);
      return NextResponse.json({ success: true });
    }

    const milestone = addMilestone(id, currentUserId, {
      title: body.title,
      description: body.description,
      target_date: body.target_date,
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 403) });
  }
}
