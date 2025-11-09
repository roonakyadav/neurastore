import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { MainLayout } from "@/components/MainLayout";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import { DevOverlayDisabler } from "@/components/DevOverlayDisabler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeuraStore+",
  description: "Advanced file analysis and storage platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientProviders>
            <DevOverlayDisabler />
            <MainLayout>{children}</MainLayout>
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
