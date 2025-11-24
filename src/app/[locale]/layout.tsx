// This layout simply passes children through. 
// The root layout at /src/app/layout.tsx handles the main HTML structure.
export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
