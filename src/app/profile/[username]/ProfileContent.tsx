import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import Image from 'next/image';
import { Award, CalendarDays, FlaskConical, Languages, Sparkles, Star, UserRound } from 'lucide-react';
import {
  getCurrentUserId,
  getUserBadges,
  getUserById,
  getUserByUsername,
  isBlocked,
  isFollowing,
} from '@/lib/services/auth';
import ProfileActions from './ProfileActions';

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(date));
}

export default async function ProfileContent({ username }: { username: string }) {
  await connection();
  const profile = getUserByUsername(username);
  if (!profile) notFound();

  const currentUserId = await getCurrentUserId();
  const currentUser = getUserById(currentUserId);
  const badges = getUserBadges(profile.id);
  const isSelf = currentUserId === profile.id;
  const following = !isSelf && isFollowing(currentUserId, profile.id);
  const blocked = !isSelf && isBlocked(currentUserId, profile.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="relative h-36 overflow-hidden bg-gradient-to-r from-violet-500/20 via-sky-500/10 to-emerald-500/15 sm:h-48">
          <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/20 bg-[var(--bg-card)]/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] backdrop-blur sm:left-8">
            <Sparkles size={13} className="text-violet-500" />
            Curio community member
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`${profile.display_name}'s avatar`}
                  width={112}
                  height={112}
                  unoptimized
                  className="h-24 w-24 shrink-0 rounded-3xl border-4 border-[var(--bg-card)] object-cover shadow-lg sm:h-28 sm:w-28"
                />
              ) : (
                <div aria-hidden="true" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-[var(--bg-card)] bg-violet-500/10 text-2xl font-black text-violet-600 shadow-lg dark:text-violet-400 sm:h-28 sm:w-28">
                  {initials(profile.display_name)}
                </div>
              )}
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-black tracking-tight text-[var(--text-main)] sm:text-3xl">{profile.display_name}</h1>
                  {profile.role !== 'user' && (
                    <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold capitalize text-violet-600 dark:text-violet-400">
                      {profile.role}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">@{profile.username}</p>
              </div>
            </div>
            {!isSelf && (
              <ProfileActions
                username={profile.username}
                initialFollowing={following}
                initialBlocked={blocked}
              />
            )}
          </div>

          {currentUser && !isSelf && currentUser.id !== profile.id && (
            <p className="mt-4 text-xs text-[var(--text-muted)]">Viewing this profile as <strong className="text-[var(--text-main)]">{currentUser.display_name}</strong>.</p>
          )}
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="space-y-5">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400"><UserRound size={17} /></div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">About</h2>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[var(--text-muted)]">
              {profile.bio?.trim() || 'This curious mind has not added a bio yet.'}
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400"><Sparkles size={17} /></div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">Curiosity map</h2>
                <p className="text-xs text-[var(--text-muted)]">Topics and interests this member is exploring</p>
              </div>
            </div>
            {profile.interests.length > 0 || profile.subjects.length > 0 ? (
              <div className="mt-4 space-y-4">
                {profile.interests.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest) => (
                        <span key={interest} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)]">{interest}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.subjects.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Subjects</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.subjects.map((subject) => (
                        <span key={subject} className="rounded-full border border-violet-500/15 bg-violet-500/5 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">{subject}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Their curiosity map is still taking shape.</p>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400"><Award size={17} /></div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">Community badges</h2>
                <p className="text-xs text-[var(--text-muted)]">Milestones earned along the way</p>
              </div>
            </div>
            {badges.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Star size={17} /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-main)]">{badge.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{badge.description}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{badge.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">No badges earned yet—there is plenty of discovery ahead.</p>
            )}
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <h2 className="text-sm font-bold text-[var(--text-main)]">Member details</h2>
            <dl className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400"><Star size={15} /></span>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Reputation</dt>
                  <dd className="mt-0.5 text-sm font-bold text-[var(--text-main)]">{profile.reputation_score} points</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400"><CalendarDays size={15} /></span>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Joined Curio</dt>
                  <dd className="mt-0.5 text-sm font-bold text-[var(--text-main)]">{formatDate(profile.created_at)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400"><Languages size={15} /></span>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Languages</dt>
                  <dd className="mt-0.5 text-sm font-bold text-[var(--text-main)]">{profile.languages.length ? profile.languages.join(', ') : 'Not listed'}</dd>
                </div>
              </div>
            </dl>
          </section>
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center gap-2">
              <FlaskConical size={16} className="text-violet-500" />
              <h2 className="text-sm font-bold text-[var(--text-main)]">Here to learn together</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              Curio is a place for questions, careful thinking, and generous collaboration. Find a shared interest and start a conversation.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
