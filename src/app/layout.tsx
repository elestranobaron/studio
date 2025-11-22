// This is the root layout that doesn't know about locales
// It's required by Next.js
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
