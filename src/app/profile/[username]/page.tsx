import { Suspense } from 'react';
import ProfileContent from './ProfileContent';

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl animate-pulse py-14 text-center text-sm text-[var(--text-muted)]">Loading profile…</div>}>
      <ProfilePageContent params={params} />
    </Suspense>
  );
}

async function ProfilePageContent({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileContent username={username} />;
}
