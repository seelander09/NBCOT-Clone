import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "NBCOT StudyPack Clone",
  description:
    "Student-focused practice platform inspired by the NBCOT StudyPack with full practice exams, drills, and study planning tools.",
  metadataBase: new URL("https://nbcot-clone.local"),
  openGraph: {
    title: "NBCOT StudyPack Clone",
    description:
      "Full-featured practice exam experience modeled after the official NBCOT StudyPack.",
    url: "https://nbcot-clone.local",
    siteName: "NBCOT StudyPack Clone",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${sourceSans.variable} font-sans bg-slate-50 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

