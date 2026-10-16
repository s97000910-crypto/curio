import { Suspense } from 'react';
import ResourceDetailClient from './ResourceDetailClient';

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading resource…</div>}>
      <ResourcePageContent params={params} />
    </Suspense>
  );
}

async function ResourcePageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResourceDetailClient id={id} />;
}
