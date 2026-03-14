import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GenerateClient } from './GenerateClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'GenerateWodPage.seo' });

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
  return <GenerateClient />;
}
