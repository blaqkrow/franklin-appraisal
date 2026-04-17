import Link from "next/link";
import type { Session } from "@/types";

export default function Header({ session }: { session: Session }) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <header className="bg-navy sticky top-0 z-30 shadow-lg">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <div>
          <Link href="/" className="block">
            <h1 className="text-white text-lg font-semibold tracking-tight">
              Franklin Offshore Staff Appraisal System
            </h1>
            <p className="text-navy-light text-xs font-light mt-0.5">
              Rigging &amp; Sling Fabrication · Office Staff &nbsp;·&nbsp; Appraisal Period
              01 Oct – 30 Sep
            </p>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-5 text-[13px] text-navy-light">
          <Link href="/" className="hover:text-white">
            Dashboard
          </Link>
          <Link href="/appraisals" className="hover:text-white">
            Appraisals
          </Link>
          <Link href="/employees" className="hover:text-white">
            Employees
          </Link>
          <Link href="/criteria" className="hover:text-white">
            Criteria
          </Link>
          <Link href="/guidelines" className="hover:text-white">
            Guidelines
          </Link>
          <span className="text-[11px] text-navy-light/70 border-l border-navy-light/30 pl-4 ml-2 leading-tight">
            HR-PRD-001 · Rev 1.0
            <br />
            {today}
          </span>
        </nav>
      </div>
    </header>
  );
}
