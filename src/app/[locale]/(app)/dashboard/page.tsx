import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import DashboardClient from './DashboardClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DashboardPage.seo' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-[125px] w-full rounded-xl" />
          <Skeleton className="h-[125px] w-full rounded-xl" />
        </div>
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}
