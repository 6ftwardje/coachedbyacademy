import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import { GlobalLoadingBar } from "@/components/GlobalLoadingBar";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CoachedBy Academy",
  description: "Opleidingsplatform voor coaches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={`${manrope.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <GlobalLoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
