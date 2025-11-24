
// This file is the root layout for all localized routes.
// It simply passes its children through, as the main layout structure
// is defined in the root layout.tsx and the app-specific layout
// is in (app)/layout.tsx.

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
