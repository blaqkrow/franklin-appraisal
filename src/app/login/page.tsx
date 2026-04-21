import LoginForm from "./LoginForm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect("/");
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="bg-navy text-white px-6 py-5">
          <h1 className="text-lg font-semibold">Franklin Offshore International</h1>
          <p className="text-navy-light text-[12px] mt-1">Staff Appraisal System · v2.1</p>
        </div>
        <div className="px-6 py-6">
          <LoginForm />
        </div>
        <div className="bg-ghost border-t border-rule px-6 py-4 text-[11px] text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-1">Demo logins (seeded)</p>
          <p>HR Admin: <strong>HR001</strong> / admin2026</p>
          <p>Senior Mgmt: MGT001 · HOD: OPS001, OFC001</p>
          <p>Appraiser: OPS010 · Workers: F0042–F0044 · Office: F2101–F2103</p>
          <p className="mt-1 italic">Default password for everyone else: franklin2026</p>
        </div>
      </div>
    </div>
  );
}
