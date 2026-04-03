import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumina TXT — Local-First AI Text Manager",
  description: "A private, local-first AI-enhanced text manager. Load, edit, organize, and analyze your .txt documents with AI — all offline, all local.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#c8f060",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexMono.variable} ${ibmPlexSans.variable} antialiased bg-surface-void text-text-base font-sans`}>
        {children}
        <Toaster />
        <SonnerToaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111118',
              border: '1px solid #22222f',
              color: '#b8b8cc',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
            },
          }}
        />
      </body>
    </html>
  );
}
