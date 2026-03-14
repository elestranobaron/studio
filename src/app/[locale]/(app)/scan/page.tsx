import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ScanClient } from './ScanClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ScanPage.seo' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function Page() {
  return <ScanClient />;
}
