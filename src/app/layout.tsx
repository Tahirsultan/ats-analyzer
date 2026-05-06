import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Editorial display serif. Variable font with optical sizing — looks tight
// at body sizes and properly weighted at the 96px composite-score number.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://ats-analyzer-gamma.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ATS Resume Analyzer — free, open, transparent",
    template: "%s · ATS Resume Analyzer",
  },
  description:
    "Free, open-source ATS resume analyzer. Compare your resume against any job description and see the math behind every score — keyword match, semantic similarity, hard requirements, and parseability.",
  openGraph: {
    title: "ATS Resume Analyzer — free, open, transparent",
    description:
      "Free, open-source ATS resume analyzer with documented scoring math.",
    url: siteUrl,
    siteName: "ATS Resume Analyzer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATS Resume Analyzer — free, open, transparent",
    description:
      "Free, open-source ATS resume analyzer with documented scoring math.",
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
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-[2px]">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          aria-label="ATS Analyzer — home"
          className="-my-2 inline-flex items-center transition-opacity hover:opacity-80"
        >
          {/*
            The brand mark is a self-contained icon + wordmark lockup, so
            the header gets just the image — no extra text alongside.
            Sized at 64px display height in an 80px header (~80% ratio,
            standard for editorial web apps). Image source is 384px square
            for crisp retina rendering; the recolor script trims white
            padding so the on-screen 64px is mostly content, not margin.
          */}
          <Image
            src="/logo.png"
            alt="ATS Analyzer"
            width={384}
            height={384}
            priority
            className="h-16 w-16"
          />
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          <NavLink href="/analyze">Analyze</NavLink>
          <NavLink href="/methodology">Methodology</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative text-muted-foreground transition-colors hover:text-foreground after:pointer-events-none after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:origin-center after:scale-x-0 after:bg-foreground after:transition-transform hover:after:scale-x-100"
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Open source. Built on documented heuristics, not magic.</p>
        <div className="flex items-center gap-6">
          <Link href="/methodology" className="hover:text-foreground transition-colors">
            Methodology
          </Link>
          <a
            href="https://github.com/Tahirsultan/ats-analyzer"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
