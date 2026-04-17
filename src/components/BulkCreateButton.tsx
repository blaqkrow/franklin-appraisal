"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BulkCreateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm("Create appraisal records for all active employees with an assigned HOD?"))
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true }),
      });
      const data = await res.json();
      alert(`Created ${data.created}, existing ${data.existing}.`);
      router.refresh();
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
