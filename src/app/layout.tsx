import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase";

export const metadata: Metadata = {
  title: "WODBurner",
  description: "Scan any WOD in seconds, time it perfectly, share instantly, and join the strongest French-speaking CrossFit community.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
};

export const viewport = {
  themeColor: "#ff0000",
};

export const appleWebApp = {
  capable: true,
  statusBarStyle: "black-translucent",
  title: "WODBurner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The lang attribute will be handled by the [locale] layout
    <html>
      <body>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
