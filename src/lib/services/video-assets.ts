import { createReadStream, createWriteStream, unlinkSync } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execute, queryOne } from '../db';
import { MAX_VIDEO_SIZE, VideoContentType, VIDEO_TYPES } from '../media-constants';

export { MAX_VIDEO_SIZE, VIDEO_TYPES };

export interface VideoAsset {
  asset_id: string;
  user_id: string;
  content_type: VideoContentType;
  file_size: number;
}

export class VideoUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'VideoUploadError';
  }
}

function getVideoDirectory(): string {
  return path.resolve(process.cwd(), 'uploads', 'videos');
}

export function isVideoAssetId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getVideoAsset(assetId: string): VideoAsset | null {
  if (!isVideoAssetId(assetId)) return null;
  return queryOne<VideoAsset>(
    'SELECT asset_id, user_id, content_type, file_size FROM video_assets WHERE asset_id = ?',
    [assetId]
  );
}

export function getVideoFilePath(asset: VideoAsset): string {
  return path.join(getVideoDirectory(), `${asset.asset_id}${VIDEO_TYPES[asset.content_type]}`);
}

export async function saveUploadedVideo(
  body: ReadableStream<Uint8Array>,
  contentType: VideoContentType,
  expectedSize: number | null,
  userId: string
): Promise<VideoAsset> {
  const assetId = randomUUID();
  const directory = getVideoDirectory();
  const extension = VIDEO_TYPES[contentType];
  const temporaryPath = path.join(directory, `${assetId}.uploading`);
  const finalPath = path.join(directory, `${assetId}${extension}`);
  let fileSize = 0;
  let signature = Buffer.alloc(0);
  let signatureChecked = false;

  await mkdir(directory, { recursive: true });

  const validateVideo = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      fileSize += chunk.length;
      if (fileSize > MAX_VIDEO_SIZE) {
        callback(new VideoUploadError('Videos must be no larger than 250 MB.', 413));
        return;
      }

      if (!signatureChecked) {
        signature = Buffer.concat([signature, chunk.subarray(0, 16 - signature.length)]);
        const hasSignature =
          contentType === 'video/mp4'
            ? signature.length >= 8 && signature.toString('ascii', 4, 8) === 'ftyp'
            : signature.length >= 4 &&
              signature[0] === 0x1a &&
              signature[1] === 0x45 &&
              signature[2] === 0xdf &&
              signature[3] === 0xa3;

        if (signature.length >= (contentType === 'video/mp4' ? 8 : 4)) {
          signatureChecked = true;
          if (!hasSignature) {
            callback(new VideoUploadError('The file contents do not match the selected video format.', 415));
            return;
          }
        }
      }

      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.from((async function* () {
        const reader = body.getReader();
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) return;
            yield Buffer.from(result.value);
          }
        } finally {
          reader.releaseLock();
        }
      })()),
      validateVideo,
      createWriteStream(temporaryPath, { flags: 'wx', mode: 0o600 })
    );

    if (fileSize === 0 || !signatureChecked) {
      throw new VideoUploadError('Choose a valid, non-empty video file.', 400);
    }
    if (expectedSize !== null && expectedSize !== fileSize) {
      throw new VideoUploadError('The video upload was incomplete. Please try again.', 400);
    }

    await rename(temporaryPath, finalPath);
    execute(
      'INSERT INTO video_assets (asset_id, user_id, content_type, file_size) VALUES (?, ?, ?, ?)',
      [assetId, userId, contentType, fileSize]
    );
    return { asset_id: assetId, user_id: userId, content_type: contentType, file_size: fileSize };
  } catch (error) {
    for (const filePath of [temporaryPath, finalPath]) {
      await unlink(filePath).catch((cleanupError: NodeJS.ErrnoException) => {
        if (cleanupError.code !== 'ENOENT') throw cleanupError;
      });
    }
    throw error;
  }
}

export async function getVideoFileSize(asset: VideoAsset): Promise<number> {
  const file = await stat(getVideoFilePath(asset));
  return file.size;
}

export function createVideoReadStream(asset: VideoAsset, start: number, end: number) {
  return createReadStream(getVideoFilePath(asset), { start, end });
}

export async function deleteUnpublishedVideo(assetId: string, userId: string): Promise<boolean> {
  const asset = getVideoAsset(assetId);
  if (!asset || asset.user_id !== userId) return false;

  if (queryOne('SELECT 1 FROM posts WHERE video_asset_id = ?', [assetId])) {
    throw new Error('This video has already been published and cannot be removed separately.');
  }

  await unlink(getVideoFilePath(asset));
  const result = execute('DELETE FROM video_assets WHERE asset_id = ? AND user_id = ?', [assetId, userId]);
  return result.changes === 1;
}

export function deleteVideoFile(assetId: string): void {
  const asset = getVideoAsset(assetId);
  if (!asset) return;
  unlinkSync(getVideoFilePath(asset));
  execute('DELETE FROM video_assets WHERE asset_id = ?', [assetId]);
}
