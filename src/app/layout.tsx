import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Forms - Create and Share Forms",
  description: "Create, manage, and share custom forms with ease",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap", // Add font-display swap for faster text rendering
  preload: true,
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <Suspense fallback={null}>{children}</Suspense>
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
