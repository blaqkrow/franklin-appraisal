import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAppraisalFull } from "@/lib/repo";
import AppraisalForm from "@/components/AppraisalForm";

export default async function AppraisalDetail({ params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const a = await getAppraisalFull(params.id, s);
  if (!a) notFound();
  return <AppraisalForm appraisal={a} role={s.role} userId={s.employeeId} />;
}
