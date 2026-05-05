import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://ats-analyzer-gamma.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ATS Resume Analyzer — free, private, transparent",
    template: "%s · ATS Resume Analyzer",
  },
  description:
    "Free, privacy-first ATS resume analyzer. Compares your resume against a job description entirely in your browser — your documents never leave your device.",
  openGraph: {
    title: "ATS Resume Analyzer — free, private, transparent",
    description:
      "Free, privacy-first ATS resume analyzer that runs entirely in your browser.",
    url: siteUrl,
    siteName: "ATS Resume Analyzer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATS Resume Analyzer — free, private, transparent",
    description:
      "Free, privacy-first ATS resume analyzer that runs entirely in your browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
            <Link href="/" className="font-semibold tracking-tight">
              ATS Analyzer
            </Link>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/analyze" className="hover:text-foreground">
                Analyze
              </Link>
              <Link href="/methodology" className="hover:text-foreground">
                Methodology
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Runs entirely in your browser. No uploads. No tracking.</p>
            <div className="flex items-center gap-5">
              <Link href="/methodology" className="hover:text-foreground">
                Methodology
              </Link>
              <a
                href="https://github.com/Tahirsultan/ats-analyzer"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
