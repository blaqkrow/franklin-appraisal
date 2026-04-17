import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import RoleBar from "@/components/RoleBar";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Franklin Offshore Staff Appraisal System",
  description: "Performance appraisal platform — Franklin Offshore International",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  return (
    <html lang="en">
      <body className="min-h-screen pb-24">
        <Header session={session} />
        <RoleBar role={session.role} />
        <main className="max-w-[1280px] mx-auto px-6 md:px-12 py-8">{children}</main>
      </body>
    </html>
  );
}
