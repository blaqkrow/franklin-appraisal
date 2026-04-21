"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BulkCreateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm("Create Annual appraisal records for all active appraisees with a routed org chart?"))
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      alert(`Created ${data.created}, already existed ${data.existing}.`);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn btn-ghost" disabled={busy} onClick={run}>
      {busy ? "Creating…" : "Bulk-create for cycle"}
    </button>
  );
}
