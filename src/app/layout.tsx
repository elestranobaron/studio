// This file is intentionally left to just pass children.
// The root layout is now handled by src/app/[locale]/layout.tsx
// to support internationalized routing.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
