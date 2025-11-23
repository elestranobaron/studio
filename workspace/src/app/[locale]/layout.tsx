
export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  console.log(`[DEBUG] src/app/[locale]/layout.tsx: Rendering layout for locale: "${params.locale}"`);
  return children;
}
