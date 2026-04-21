import Link from "next/link";
import LogoutButton from "./LogoutButton";
import type { Session } from "@/types";
import { ROLE_LABEL } from "@/lib/workflow";

export default function Header({ session }: { session: Session }) {
  const navLinks: { href: string; label: string; roles?: Session["role"][] }[] = [
    { href: "/", label: "Dashboard" },
    { href: "/appraisals", label: "Appraisals" },
    { href: "/employees", label: "Employees", roles: ["hr_admin"] },
    { href: "/reports", label: "Reports", roles: ["hr_admin", "senior_management"] },
    { href: "/criteria", label: "Criteria" },
    { href: "/guidelines", label: "Guidelines" },
  ];
  const visible = navLinks.filter((l) => !l.roles || l.roles.includes(session.role));

  return (
    <header className="bg-navy sticky top-0 z-30 shadow-lg">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex-1 min-w-0">
          <h1 className="text-white text-[15px] sm:text-lg font-semibold tracking-tight truncate">
            Franklin Offshore — Appraisal System
          </h1>
          <p className="text-navy-light text-[11px] sm:text-xs font-light mt-0.5 truncate">
            {session.name} · {ROLE_LABEL[session.role]} · {session.employeeNo}
          </p>
        </Link>
        <details className="sm:hidden relative">
          <summary className="text-white cursor-pointer list-none px-2 py-1 border border-navy-light/30 rounded text-[13px]">
            Menu
          </summary>
          <div className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border border-rule min-w-[200px] py-2 z-40">
            {visible.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block px-4 py-2 text-[13px] hover:bg-ghost"
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-rule mt-1 pt-1 px-4">
              <LogoutButton variant="mobile" />
            </div>
          </div>
        </details>
        <nav className="hidden sm:flex items-center gap-4 text-[13px] text-navy-light">
          {visible.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white whitespace-nowrap">
              {l.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
