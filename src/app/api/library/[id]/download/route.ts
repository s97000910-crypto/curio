import { NextRequest, NextResponse } from 'next/server';
import { getResourceById, incrementResourceDownload } from '@/lib/services/library';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resource = getResourceById(id);
    if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

    incrementResourceDownload(id);
    return NextResponse.json({ success: true, source_url: resource.source_url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
