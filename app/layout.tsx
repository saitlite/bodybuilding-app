import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "減量管理",
  description: "カロリー収支アプリ",
  manifest: "/manifest.json",
  icons: {
    icon: "/tashiro.ico",
    shortcut: "/tashiro.ico",
    apple: "/tashiro.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "減量管理",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${notoSansJp.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
