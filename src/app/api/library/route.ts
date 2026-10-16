import { NextRequest, NextResponse } from 'next/server';
import { getResources, getLicenses, submitResource } from '@/lib/services/library';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const search = searchParams.get('search') || undefined;
    const licenseId = searchParams.get('licenseId') || undefined;

    const resources = getResources({ subject, difficulty, search, licenseId });
    const licenses = getLicenses();

    return NextResponse.json({ resources, licenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 500) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();

    const resource = submitResource({
      ...body,
      uploader_id: currentUserId,
    });

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: getAuthErrorStatus(error, 400) });
  }
}
