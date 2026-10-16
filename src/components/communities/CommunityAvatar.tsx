import Image from 'next/image';
import type { Community } from '@/lib/db/types';

export function CommunityAvatar({
  community,
  className,
}: {
  community: Pick<Community, 'name' | 'image_url' | 'color'>;
  className: string;
}) {
  return (
    <div
      className={`relative isolate flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: `${community.color}25`, color: community.color }}
    >
      {community.image_url ? (
        <Image
          src={community.image_url}
          alt={`${community.name} community picture`}
          fill
          sizes="(max-width: 768px) 80px, 96px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true">{community.name.charAt(0)}</span>
      )}
    </div>
  );
}
