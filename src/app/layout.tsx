import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Franklin Offshore — Appraisal System",
  description: "Digital Performance Appraisal Platform — Franklin Offshore International (v2.1)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1e3a5f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="min-h-screen pb-20">
        {session && <Header session={session} />}
        <main className={session ? "max-w-[1280px] mx-auto px-3 sm:px-8 py-5 sm:py-8" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}
