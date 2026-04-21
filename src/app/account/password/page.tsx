import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Change your password</h2>
      <p className="text-[13px] text-slate-600 mb-4">
        You're using a temporary password assigned by HR. Please set a new password before continuing.
      </p>
      <ChangePasswordForm />
    </div>
  );
}
