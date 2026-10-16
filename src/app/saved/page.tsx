import type { Metadata } from 'next';
import SavedPostsClient from './SavedPostsClient';

export const metadata: Metadata = {
  title: 'Saved — Curio',
};

export default function SavedPage() {
  return <SavedPostsClient />;
}
