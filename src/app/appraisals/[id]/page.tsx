import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAppraisal, getEmployee } from "@/lib/store";
import { canView } from "@/lib/workflow";
import AppraisalForm from "@/components/AppraisalForm";

export default function AppraisalDetail({ params }: { params: { id: string } }) {
  const session = getSession();
  const a = getAppraisal(params.id);
  if (!a) notFound();
  if (!canView(session.role, a, session.userId)) redirect("/");
  const employee = getEmployee(a.employeeId);
  if (!employee) notFound();
  const hod = a.hodId ? getEmployee(a.hodId) : undefined;
  const countersigner = a.countersignerId ? getEmployee(a.countersignerId) : undefined;

  return (
    <AppraisalForm
      appraisal={a}
      employee={employee}
      session={session}
      hod={hod}
      countersigner={countersigner}
    />
  );
}
