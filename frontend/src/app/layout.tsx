import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { themeScript } from "@/lib/theme-script";
import { Providers } from "./providers";
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
  title: { default: "Auto Parts", template: "%s · Auto Parts" },
  description: "Inventory, stock and billing for the shop",
};

// Props typed by hand: Next's generated LayoutProps only exists after the first dev/build run,
// so a fresh checkout (and CI's type check) wouldn't know it
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by the inline script before hydration, so React must not complain about it
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* browser extensions (Grammarly, password managers) add attributes to <body> before React loads */}
      <body className="min-h-full" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
