// src/app/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from "@/firebase/provider";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={params.locale} messages={messages}>
      <FirebaseProvider>
        {children}
        <Toaster />
      </FirebaseProvider>
    </NextIntlClientProvider>
  );
}
