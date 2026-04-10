import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const metadataBase = new URL(
  typeof process.env.VERCEL_URL === "string"
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase,
  title: "NyraAI Console — Intelligence Redefined",
  description:
    "Operational dashboard for NyraAI: analytics, workflows, and AI adoption insights.",
  icons: {
    icon: "/nyraai-logo.png",
    apple: "/nyraai-logo.png",
  },
  openGraph: {
    title: "NyraAI Console — Intelligence Redefined",
    description:
      "Operational dashboard for NyraAI: analytics, workflows, and AI adoption insights.",
    images: [
      {
        url: "/nyraai-logo.png",
        width: 1200,
        height: 630,
        alt: "NyraAI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NyraAI Console — Intelligence Redefined",
    description:
      "Operational dashboard for NyraAI: analytics, workflows, and AI adoption insights.",
    images: ["/nyraai-logo.png"],
  },
};

const themeInitScript = `
(function(){
  try {
    var k = 'nyra-theme';
    var stored = localStorage.getItem(k);
    var theme;
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-svh min-h-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <Script
          id="nyra-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {children}
      </body>
    </html>
  );
}
