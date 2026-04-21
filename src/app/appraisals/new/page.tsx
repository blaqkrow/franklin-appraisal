import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listEmployees, currentCycleYear } from "@/lib/repo";
import NewAppraisalForm from "./NewAppraisalForm";

export default async function NewAppraisal() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "hr_admin") redirect("/");
  const employees = (await listEmployees()).filter(
    (e) => e.is_active && e.role === "appraisee",
  );
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg sm:text-xl font-semibold">New Appraisal</h2>
      <NewAppraisalForm employees={employees} cycleYear={currentCycleYear()} />
    </div>
  );
}
