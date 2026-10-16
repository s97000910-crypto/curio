import Link from 'next/link';
import { Suspense } from 'react';
import { Search, Users, MessagesSquare, BookOpen, Video, Layers, Lightbulb, UserRound } from 'lucide-react';
import { connection } from 'next/server';
import { searchAll } from '@/lib/services/search';

type SearchParams = Promise<{ q?: string | string[] }>;

function readQueryParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl animate-pulse py-14 text-center text-sm text-[var(--text-muted)]">Searching Curio…</div>}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const query = readQueryParam((await searchParams).q).trim();
  if (query) await connection();
  const results = query ? searchAll(query, 20) : null;

  const sections = results ? [
    { title: 'Inquiries & discussions', icon: MessagesSquare, items: results.posts, href: (item: Record<string, string>) => item.community_slug ? `/c/${item.community_slug}` : '/', detail: (item: Record<string, string>) => item.community_name || 'Community discussion', titleOf: (item: Record<string, string>) => item.title },
    { title: 'People', icon: UserRound, items: results.people, href: (item: Record<string, string>) => `/profile/${item.username}`, detail: (item: Record<string, string>) => item.bio || `@${item.username}`, titleOf: (item: Record<string, string>) => item.display_name },
    { title: 'Communities', icon: Users, items: results.communities, href: (item: Record<string, string>) => `/c/${item.slug}`, detail: (item: Record<string, string>) => item.description, titleOf: (item: Record<string, string>) => item.name },
    { title: 'Library', icon: BookOpen, items: results.resources, href: (item: Record<string, string>) => `/library/${item.id}`, detail: (item: Record<string, string>) => item.author || item.description, titleOf: (item: Record<string, string>) => item.title },
    { title: 'Lectures', icon: Video, items: results.lectures, href: (item: Record<string, string>) => `/lectures/${item.id}`, detail: (item: Record<string, string>) => `${item.instructor} · ${item.institution}`, titleOf: (item: Record<string, string>) => item.title },
    { title: 'Study circles', icon: Layers, items: results.circles, href: (item: Record<string, string>) => `/circles/${item.slug}`, detail: (item: Record<string, string>) => item.description, titleOf: (item: Record<string, string>) => item.name },
    { title: 'Ideas Lab', icon: Lightbulb, items: results.investigations, href: (item: Record<string, string>) => `/ideas/${item.slug}`, detail: (item: Record<string, string>) => item.summary, titleOf: (item: Record<string, string>) => item.title },
  ] : [];

  const resultCount = results?.totalCount ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-sky-500/10 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--text-main)]">
          <Search className="text-violet-600" /> Search Curio
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Explore human-authored ideas, people, and learning resources.</p>
        <form action="/search" className="mt-5 flex gap-2">
          <label htmlFor="search-query" className="sr-only">Search Curio</label>
          <input
            id="search-query"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Try a subject, question, or name..."
            className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-main)]"
          />
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
            <Search size={16} /><span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </header>

      {!query ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-14 text-center">
          <Search size={28} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="font-semibold text-[var(--text-main)]">What are you curious about?</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Enter a search above to explore all of Curio.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--text-muted)]">
            {resultCount === 0 ? `No results for “${query}”.` : `${resultCount} result${resultCount === 1 ? '' : 's'} for “${query}”.`}
          </p>
          {resultCount > 0 && (
            <div className="space-y-5">
              {sections.filter((section) => section.items.length > 0).map((section) => {
                const Icon = section.icon;
                return (
                  <section key={section.title} aria-label={section.title} className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                    <h2 className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4 text-sm font-bold text-[var(--text-main)]">
                      <Icon size={17} className="text-violet-600" /> {section.title}
                      <span className="ml-auto rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-muted)]">{section.items.length}</span>
                    </h2>
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {section.items.map((item: Record<string, string>) => (
                        <li key={item.id}>
                          <Link href={section.href(item)} className="block px-5 py-4 transition hover:bg-[var(--bg-elevated)]">
                            <span className="block text-sm font-semibold text-[var(--text-main)]">{section.titleOf(item) || 'Untitled'}</span>
                            <span className="mt-1 block line-clamp-2 text-xs text-[var(--text-muted)]">{section.detail(item)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
