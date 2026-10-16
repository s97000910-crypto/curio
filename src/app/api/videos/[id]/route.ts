import { NextRequest, NextResponse } from 'next/server';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';
import { queryOne } from '@/lib/db';
import {
  createVideoReadStream,
  getVideoAsset,
  getVideoFileSize,
} from '@/lib/services/video-assets';

function parseByteRange(value: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start >= size ||
    requestedEnd < start
  ) {
    return null;
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await params;
    const asset = getVideoAsset(id);
    if (!asset) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }
    const post = queryOne<{ author_id: string }>(
      'SELECT author_id FROM posts WHERE video_asset_id = ?',
      [id]
    );
    if (!post && asset.user_id !== userId) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    const size = await getVideoFileSize(asset);
    const requestedRange = request.headers.get('range');
    let start = 0;
    let end = size - 1;
    let status = 200;

    if (requestedRange) {
      const range = parseByteRange(requestedRange, size);
      if (!range) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' },
        });
      }
      ({ start, end } = range);
      status = 206;
    }

    const fileStream = createVideoReadStream(asset, start, end);
    const fileIterator = fileStream[Symbol.asyncIterator]();
    const stream = new globalThis.ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const chunk = await fileIterator.next();
          if (chunk.done) {
            controller.close();
          } else {
            controller.enqueue(chunk.value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        fileStream.destroy();
      },
    });
    return new NextResponse(stream, {
      status,
      headers: {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(end - start + 1),
        'Content-Type': asset.content_type,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
      },
    });
  } catch (error: unknown) {
    console.error('Failed to stream video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not play the video.' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}
