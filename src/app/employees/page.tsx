import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listEmployees } from "@/lib/store";
import EmployeeManager from "./EmployeeManager";

export default function EmployeesPage() {
  const session = getSession();
  if (session.role !== "admin") redirect("/");
  const employees = listEmployees();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Employees</h2>
      <EmployeeManager initial={employees} />
    </div>
  );
}
