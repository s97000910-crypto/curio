'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowLeft, Scale, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ResourceLicense } from '@/lib/db/types';

export default function SubmitResourcePage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<ResourceLicense[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Specialized'>('Intermediate');
  const [year, setYear] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [licenseId, setLicenseId] = useState('lic_pd');
  const [legalConfirmation, setLegalConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/library')
      .then((r) => r.json())
      .then((data) => {
        if (data.licenses) {
          setLicenses(data.licenses);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalConfirmation) {
      setError('You must check the legal confirmation to submit a resource.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          description,
          subject,
          difficulty_level: difficulty,
          publication_year: year ? parseInt(year) : undefined,
          source_url: sourceUrl,
          license_id: licenseId,
          legal_confirmation: legalConfirmation,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      router.push(`/library/${data.resource.id}`);
    } catch (err: any) {
      setError(err.message || 'Error submitting resource');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
      >
        <ArrowLeft size={14} />
        <span>Back to Open Library</span>
      </Link>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <Scale className="text-amber-500" />
            <span>Submit an Open Knowledge Resource</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Contribute a verified public-domain text, openly licensed course notes, or open-access preprint.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Resource Title</label>
              <input
                type="text"
                placeholder="e.g. Linear Algebra Done Right Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Author / Creator</label>
              <input
                type="text"
                placeholder="e.g. Sheldon Axler"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Philosophy">Philosophy</option>
                <option value="History">History</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Specialized">Specialized</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Publication Year</label>
              <input
                type="number"
                placeholder="e.g. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Legitimate Source URL</label>
            <input
              type="url"
              placeholder="https://... (e.g. official repository, Project Gutenberg, arXiv)"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              required
            />
            <p className="text-3xs text-[var(--text-muted)] mt-1">
              Provide a direct URL to the legitimate publisher, institutional repository, or open archive.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">License & Permission Basis</label>
            <select
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
            >
              {licenses.map((lic) => (
                <option key={lic.id} value={lic.id}>
                  {lic.code} — {lic.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Description & Key Topics</label>
            <textarea
              rows={3}
              placeholder="Summarize the resource, mathematical or conceptual approach, and target audience..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              required
            />
          </div>

          {/* Mandatory Legal Declaration Checklist */}
          <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="legalConfirm"
                checked={legalConfirmation}
                onChange={(e) => setLegalConfirmation(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="legalConfirm" className="text-xs text-[var(--text-main)] font-semibold leading-relaxed">
                Mandatory Legal Declaration: I confirm this work is in the public domain, licensed under an open license (Creative Commons / MIT / GNU), or authorized for distribution. I acknowledge that unauthorized copyrighted files will be removed.
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/library"
              className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-subtle)]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
