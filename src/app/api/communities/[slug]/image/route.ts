import { NextRequest, NextResponse } from 'next/server';
import {
  canManageCommunityImage,
  getCommunityBySlug,
  getCommunityImage,
  removeCommunityImage,
  saveCommunityImage,
} from '@/lib/services/communities';
import { getAuthErrorStatus, getCurrentUserId } from '@/lib/services/auth';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasValidSignature(data: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/png') {
    return data.length >= 8 &&
      data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 &&
      data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  }
  if (mimeType === 'image/jpeg') {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return data.length >= 12 &&
      data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
      data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50;
  }
  return false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const image = getCommunityImage(slug);
  if (!image) return NextResponse.json({ error: 'Community picture not found' }, { status: 404 });

  return new NextResponse(Buffer.from(image.image_data), {
    headers: {
      'Content-Type': image.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const userId = await getCurrentUserId();
    const community = getCommunityBySlug(slug, userId);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    if (!canManageCommunityImage(community.id, userId)) {
      return NextResponse.json({ error: 'Only community creators, admins, or moderators can change this picture' }, { status: 403 });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_SIZE + 64_000) {
      return NextResponse.json({ error: 'Image must be no larger than 5 MB' }, { status: 413 });
    }

    const file = (await request.formData()).get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose an image file to upload' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 5 MB' }, { status: 413 });
    }
    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Use a PNG, JPG, or WebP image' }, { status: 415 });
    }

    const imageData = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(imageData, file.type)) {
      return NextResponse.json({ error: 'The file contents do not match its image type' }, { status: 415 });
    }

    const imageUrl = saveCommunityImage(community.id, slug, userId, imageData, file.type);
    return NextResponse.json({ image_url: imageUrl });
  } catch (error) {
    console.error('Failed to upload community picture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not upload the community picture' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const userId = await getCurrentUserId();
    const community = getCommunityBySlug(slug, userId);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    if (!canManageCommunityImage(community.id, userId)) {
      return NextResponse.json({ error: 'Only community creators, admins, or moderators can change this picture' }, { status: 403 });
    }

    removeCommunityImage(community.id, userId);
    return NextResponse.json({ image_url: null });
  } catch (error) {
    console.error('Failed to remove community picture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not remove the community picture' },
      { status: getAuthErrorStatus(error, 500) }
    );
  }
}
