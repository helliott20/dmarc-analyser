import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SchemaMarkup } from "@/components/seo/schema-markup";
import { getOrganizationSchema, getSoftwareApplicationSchema } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://app.dmarcanalyser.io"),
  title: {
    default: "DMARC Analyser - Monitor & Protect Email Reputation",
    template: "%s | DMARC Analyser",
  },
  description: "Real-time DMARC monitoring, AI-powered insights, and email authentication analysis. Secure your domain with automated SPF, DKIM, and DMARC reports. Start free.",
  keywords: [
    "DMARC monitoring",
    "email authentication",
    "SPF",
    "DKIM",
    "email security",
    "deliverability",
    "email compliance",
    "email reputation",
    "DNS records"
  ],
  authors: [{ name: "Redactbox" }],
  creator: "Redactbox",
  publisher: "Redactbox",
  formatDetection: {
    email: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://app.dmarcanalyser.io",
    siteName: "DMARC Analyser",
    title: "DMARC Analyser - Monitor & Protect Email Reputation",
    description: "Real-time DMARC monitoring with AI-powered insights and email authentication analysis.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DMARC Analyser - Email Authentication Monitoring",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DMARC Analyser - Monitor & Protect Email Reputation",
    description: "Real-time DMARC monitoring with AI-powered insights.",
    images: ["/og-image.png"],
    creator: "@redactbox",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SchemaMarkup schema={getOrganizationSchema()} />
        <SchemaMarkup schema={getSoftwareApplicationSchema()} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
