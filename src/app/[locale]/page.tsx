
import { redirect } from 'next/navigation';

// This page only redirects to the dashboard.
// The real "root" page is the dashboard.
export default function RootPage() {
  redirect('/dashboard');
}
