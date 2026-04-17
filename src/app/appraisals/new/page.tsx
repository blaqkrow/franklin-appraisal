import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listEmployees } from "@/lib/store";
import NewAppraisalForm from "./NewAppraisalForm";

export default function NewAppraisal() {
  const session = getSession();
  if (session.role !== "admin") redirect("/");
  const employees = listEmployees().filter((e) => e.isActive);
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold">New Appraisal</h2>
      <NewAppraisalForm employees={employees} />
    </div>
  );
}
