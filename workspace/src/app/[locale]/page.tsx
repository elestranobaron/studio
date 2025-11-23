
import { redirect } from 'next/navigation';

// This page only redirects to the dashboard.
// The real "root" page is the dashboard.
export default function RootPage({ params }: { params: { locale: string }}) {
  console.log(`[DEBUG] src/app/[locale]/page.tsx: Reached root page for locale "${params.locale}". Redirecting...`);
  redirect('/dashboard');
}
