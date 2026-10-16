export const MAX_VIDEO_SIZE = 250 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 30 * 60;
export const VIDEO_TYPES = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
} as const;

export type VideoContentType = keyof typeof VIDEO_TYPES;
