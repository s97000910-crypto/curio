import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { getInvestigationById, getInvestigationComments } from '@/lib/services/ideas';
import InvestigationDetail from './InvestigationDetail';

export default function InvestigationPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl animate-pulse py-14 text-center text-sm text-[var(--text-muted)]">Loading investigation…</div>}>
      <InvestigationContent params={params} />
    </Suspense>
  );
}

async function InvestigationContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const investigation = getInvestigationById(slug);
  if (!investigation) notFound();

  const comments = getInvestigationComments(investigation.id);
  return <InvestigationDetail investigation={investigation} initialComments={comments} />;
}
