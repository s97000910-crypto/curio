import { NextRequest, NextResponse } from 'next/server';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';
import {
  deleteUnpublishedVideo,
  MAX_VIDEO_SIZE,
  saveUploadedVideo,
  VIDEO_TYPES,
  VideoUploadError,
} from '@/lib/services/video-assets';
import { VideoContentType } from '@/lib/media-constants';

function isVideoContentType(value: string): value is VideoContentType {
  return Object.hasOwn(VIDEO_TYPES, value);
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Cross-origin video uploads are not allowed.' }, { status: 403 });
    }

    const userId = await getCurrentUserId();
    if (!request.body) {
      return NextResponse.json({ error: 'Choose a video file to upload.' }, { status: 400 });
    }

    const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!isVideoContentType(contentType)) {
      return NextResponse.json({ error: 'Upload an MP4 or WebM video.' }, { status: 415 });
    }

    const rawLength = request.headers.get('content-length');
    const contentLength = rawLength === null ? null : Number(rawLength);
    if (
      (rawLength !== null && (!Number.isSafeInteger(contentLength) || contentLength === null || contentLength <= 0)) ||
      (contentLength !== null && contentLength > MAX_VIDEO_SIZE)
    ) {
      return NextResponse.json({ error: 'Videos must be no larger than 250 MB.' }, { status: 413 });
    }

    const asset = await saveUploadedVideo(
      request.body,
      contentType,
      contentLength,
      userId
    );
    return NextResponse.json({ asset_id: asset.asset_id, file_size: asset.file_size }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof VideoUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Failed to store video upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not upload the video.' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Cross-origin video uploads are not allowed.' }, { status: 403 });
    }

    const userId = await getCurrentUserId();
    const assetId = request.nextUrl.searchParams.get('id') || '';
    const removed = await deleteUnpublishedVideo(assetId, userId);
    if (!removed) {
      return NextResponse.json({ error: 'This video upload was not found for your account.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to remove unpublished video upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not remove the video upload.' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}
