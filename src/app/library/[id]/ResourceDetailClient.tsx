'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  ExternalLink,
  Download,
  ShieldAlert,
  Scale,
  CheckCircle,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { Resource } from '@/lib/db/types';
import { ReportModal } from '@/components/ui/ReportModal';

export default function ResourceDetailClient({ id }: { id: string }) {
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch('/api/library')
      .then((r) => r.json())
      .then((data) => {
        const found = data.resources?.find((r: Resource) => r.id === id);
        if (found) setResource(found);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!resource) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/library/${resource.id}/download`, { method: 'POST' });
      const data = await res.json();
      if (data.source_url) {
        window.open(data.source_url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading resource...
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold">Resource Not Found</h2>
        <Link href="/library" className="text-xs text-amber-600 underline">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
      >
        <ArrowLeft size={14} />
        <span>Back to Open Library</span>
      </Link>

      {/* Main Resource Card */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              {resource.subject}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {resource.difficulty_level}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Verified License
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] leading-tight">
            {resource.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
            <span className="flex items-center gap-1">
              <User size={14} />
              <span>{resource.author}</span>
            </span>
            {resource.publication_year && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{resource.publication_year}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Download size={14} />
              <span>{resource.download_count} accesses</span>
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 border-t border-b border-[var(--border-subtle)] py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            About this Work
          </h3>
          <p className="text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-line">
            {resource.description}
          </p>
        </div>

        {/* Legal & Licensing Details Box */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Scale size={16} />
              <span>License & Legal Rights</span>
            </div>
            <span className="text-xs font-bold text-[var(--text-main)]">
              {resource.license?.code}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center">
              <div className="text-2xs text-[var(--text-muted)] font-semibold">Redistribution</div>
              <div className="text-xs font-bold text-emerald-600">
                {resource.license?.can_redistribute ? 'Permitted' : 'Restricted'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center">
              <div className="text-2xs text-[var(--text-muted)] font-semibold">Attribution</div>
              <div className="text-xs font-bold text-[var(--text-main)]">
                {resource.license?.attribution_required ? 'Required' : 'None Needed'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center">
              <div className="text-2xs text-[var(--text-muted)] font-semibold">Commercial Use</div>
              <div className="text-xs font-bold text-[var(--text-main)]">
                {resource.license?.commercial_allowed ? 'Allowed' : 'Non-Commercial'}
              </div>
            </div>
          </div>

          <div className="text-2xs text-[var(--text-muted)] leading-relaxed">
            Full License Details:{' '}
            <a
              href={resource.license?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 underline font-medium"
            >
              {resource.license?.name}
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 transition"
          >
            <ShieldAlert size={14} />
            <span>Copyright or Quality Complaint</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 transition disabled:opacity-50"
          >
            <ExternalLink size={14} />
            <span>{downloading ? 'Accessing...' : 'Read / Download Source'}</span>
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="resource"
        targetId={resource.id}
        targetTitle={resource.title}
      />
    </div>
  );
}
