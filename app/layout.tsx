import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { CookieNotice } from "@/components/marketing/cookie-notice";
import { ORGANIZATION_JSON_LD, SITE_NAME, SITE_URL, WEBSITE_JSON_LD, jsonLdScriptProps } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Did AI Write It? | Free AI Content Detector";
const DESCRIPTION =
  "Paste any text and get an instant AI-detection score, sentence by sentence, free and with no account needed. Built for checking LinkedIn posts, newsletters, and marketing copy before they go out.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script {...jsonLdScriptProps(ORGANIZATION_JSON_LD)} />
        <script {...jsonLdScriptProps(WEBSITE_JSON_LD)} />
        <ThemeProvider>
          {children}
          <CookieNotice />
        </ThemeProvider>
      </body>
    </html>
  );
}
