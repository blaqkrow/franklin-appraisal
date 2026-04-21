import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listEmployees } from "@/lib/repo";
import EmployeeManager from "./EmployeeManager";

export default async function EmployeesPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "hr_admin") redirect("/");
  const employees = await listEmployees();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-lg sm:text-xl font-semibold">Employees</h2>
        <a href="/employees/import" className="btn btn-ghost">
          ⬆ Import Org Chart
        </a>
      </div>
      <EmployeeManager initial={employees} />
    </div>
  );
}
