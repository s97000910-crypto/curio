'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image, BarChart2, BookOpen, Atom, HelpCircle, Eye, Edit3, Video } from 'lucide-react';
import { Community, PostType } from '@/lib/db/types';
import { MathRenderer } from './MathRenderer';
import { StickerPicker } from './StickerPicker';
import { MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_SIZE, VIDEO_TYPES } from '@/lib/media-constants';

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Curio could not read this video. Try an MP4 or WebM file.'));
    };
    video.src = objectUrl;
  });
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultCommunityId?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCommunityId,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('discovery');
  const [communityId, setCommunityId] = useState(defaultCommunityId || 'c_math');
  const [flair, setFlair] = useState('');
  const [stickerCode, setStickerCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/communities')
        .then((r) => r.json())
        .then((d) => {
          if (d.communities) {
            setCommunities(d.communities);
            if (!defaultCommunityId && d.communities.length > 0) {
              setCommunityId(d.communities[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultCommunityId]);

  if (!isOpen) return null;

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  const handleVideoSelection = async (file: File | undefined) => {
    setVideoFile(null);
    setError(null);
    if (!file) return;
    if (!Object.hasOwn(VIDEO_TYPES, file.type)) {
      setError('Choose an MP4 or WebM video.');
      return;
    }
    if (file.size === 0 || file.size > MAX_VIDEO_SIZE) {
      setError('Videos must be between 1 byte and 250 MB.');
      return;
    }

    try {
      const duration = await readVideoDuration(file);
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Curio could not read this video’s duration.');
      }
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        throw new Error('Videos can be up to 30 minutes long.');
      }
      setVideoFile(file);
    } catch (selectionError: unknown) {
      setError(selectionError instanceof Error ? selectionError.message : 'Could not check this video.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    if (postType === 'poll') {
      const validOptions = pollOptions.filter((o) => o.trim().length > 0);
      if (validOptions.length < 2) {
        setError('Polls require at least 2 non-empty options.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    let uploadedVideoAssetId: string | undefined;
    try {
      if (videoFile) {
        setUploadingVideo(true);
        const uploadResponse = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': videoFile.type },
          body: videoFile,
        });
        const uploadResult: { asset_id?: string; error?: string } = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.asset_id) {
          throw new Error(uploadResult.error || 'Could not upload the video.');
        }
        uploadedVideoAssetId = uploadResult.asset_id;
        setUploadingVideo(false);
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          post_type: postType,
          community_id: communityId,
          flair: flair.trim() || undefined,
          sticker_code: stickerCode || undefined,
          image_url: imageUrl.trim() || undefined,
          video_asset_id: uploadedVideoAssetId,
          poll_options: postType === 'poll' ? pollOptions.filter((o) => o.trim().length > 0) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');

      // Reset
      setTitle('');
      setContent('');
      setFlair('');
      setStickerCode('');
      setImageUrl('');
      setVideoFile(null);
      setPollOptions(['', '']);
      uploadedVideoAssetId = undefined;
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating post.';
      if (uploadedVideoAssetId) {
        try {
          const cleanupResponse = await fetch(`/api/videos?id=${encodeURIComponent(uploadedVideoAssetId)}`, {
            method: 'DELETE',
          });
          if (!cleanupResponse.ok) {
            const cleanupResult: { error?: string } = await cleanupResponse.json();
            throw new Error(cleanupResult.error || 'Could not remove the unused video upload.');
          }
        } catch (cleanupError: unknown) {
          console.error('Could not clean up the unpublished video upload:', cleanupError);
          setError(`${message} The unused video could not be removed; please try again or contact support.`);
          return;
        }
      }
      setError(message);
    } finally {
      setUploadingVideo(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold">
            ✦
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-main)]">Share an Inquiry or Discovery</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Human-authored thoughts, derivations, questions, and curated resources.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post Type Selector */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
            {[
              { type: 'discovery', label: 'Discovery', icon: Sparkles },
              { type: 'question', label: 'Question', icon: HelpCircle },
              { type: 'text', label: 'Discussion', icon: BookOpen },
              { type: 'poll', label: 'Poll', icon: BarChart2 },
              { type: 'image', label: 'Diagram / Image', icon: Image },
              { type: 'meme', label: 'Meme / Humor', icon: Atom },
            ].map((t) => {
              const Icon = t.icon;
              const active = postType === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setPostType(t.type as PostType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Community & Flair selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Community
              </label>
              <select
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Topic Flair (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Proof, Geometric Topology, Historical Context"
                value={flair}
                onChange={(e) => setFlair(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="State your question, thesis, or discovery clearly..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm font-semibold focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              required
            />
          </div>

          {/* Sticker picker */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Community Sticker (Optional)
            </label>
            <StickerPicker selected={stickerCode} onSelect={(code) => setStickerCode(code)} />
          </div>

          {/* Poll Options (if poll) */}
          {postType === 'poll' && (
            <div className="p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] space-y-2">
              <label className="block text-xs font-bold text-violet-600 dark:text-violet-400">
                Poll Choices
              </label>
              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              ))}
              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                >
                  + Add another option
                </button>
              )}
            </div>
          )}

          {/* Image URL input (if image or meme) */}
          {(postType === 'image' || postType === 'meme') && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Image / Diagram URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}

          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
            <label htmlFor="post-video" className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <Video size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">Add a short or long video</span>
                <span className="mt-0.5 block text-[10px] font-normal text-[var(--text-muted)]">
                  MP4 or WebM · up to 250 MB · up to 30 minutes
                </span>
              </span>
            </label>
            <input
              id="post-video"
              type="file"
              accept="video/mp4,video/webm"
              className="sr-only"
              onChange={(event) => void handleVideoSelection(event.target.files?.[0])}
            />
            {videoFile && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-card)] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{videoFile.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB · ready to upload
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoFile(null)}
                  aria-label="Remove selected video"
                  className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Content with KaTeX preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                Body & Exposition (Supports KaTeX math notation: <code className="text-violet-600">$inline$</code> and <code className="text-violet-600">$$block$$</code>)
              </label>
              <div className="flex items-center rounded-lg border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-canvas)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-md font-medium transition ${
                    activeTab === 'write' ? 'bg-[var(--bg-card)] text-violet-600 shadow-xs' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Edit3 size={12} />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-md font-medium transition ${
                    activeTab === 'preview' ? 'bg-[var(--bg-card)] text-violet-600 shadow-xs' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Eye size={12} />
                  <span>Preview Math</span>
                </button>
              </div>
            </div>

            {activeTab === 'write' ? (
              <textarea
                rows={6}
                placeholder="Share your reasoning, proof steps, or question. Mathematical expressions can be enclosed in $...$ (inline) or $$...$$ (centered block)."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm font-sans focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                required
              />
            ) : (
              <div className="w-full min-h-[140px] max-h-[260px] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5 text-sm">
                {content ? (
                  <MathRenderer content={content} />
                ) : (
                  <p className="text-[var(--text-muted)] italic text-xs">Nothing to preview yet. Switch back to write.</p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-2xs text-[var(--text-muted)]">
            Curio is human-powered. Videos are stored on this server.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition disabled:opacity-50"
              >
                {submitting ? (uploadingVideo ? 'Uploading video…' : 'Publishing...') : 'Publish Post'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
