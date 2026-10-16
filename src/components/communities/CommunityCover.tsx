import Image from 'next/image';
import type { Community } from '@/lib/db/types';

const coverBySlug: Record<string, string> = {
  mathematics: '/community-covers/mathematics.svg',
  physics: '/community-covers/physics.svg',
  'computer-science': '/community-covers/computer-science.svg',
  philosophy: '/community-covers/philosophy.svg',
  'art-and-history': '/community-covers/art-and-history.svg',
};

function coverFor(community: Pick<Community, 'slug' | 'category'>) {
  if (coverBySlug[community.slug]) return coverBySlug[community.slug];
  const category = community.category.toLowerCase();
  if (category.includes('math')) return coverBySlug.mathematics;
  if (category.includes('science') || category.includes('tech')) return coverBySlug.physics;
  if (category.includes('humanities') || category.includes('arts')) return coverBySlug.philosophy;
  return coverBySlug['art-and-history'];
}

export function CommunityCover({
  community,
  className,
  eager = false,
}: {
  community: Pick<Community, 'name' | 'slug' | 'category'>;
  className: string;
  eager?: boolean;
}) {
  return (
    <div className={`relative isolate overflow-hidden bg-[var(--bg-elevated)] ${className}`}>
      <Image
        src={coverFor(community)}
        alt={`${community.name} community cover`}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        loading={eager ? 'eager' : 'lazy'}
        className="object-cover"
      />
    </div>
  );
}
