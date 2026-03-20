import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";

const geist = Manrope({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"]
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"]
});

export const metadata: Metadata = {
  title: "PI Digital",
  description: "PI Digital internal operations workspace."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geist.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
