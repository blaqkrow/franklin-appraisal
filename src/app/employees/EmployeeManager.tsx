"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppRole, Employee, FormType } from "@/types";
import { ROLE_LABEL } from "@/lib/workflow";

const ROLES: AppRole[] = ["hr_admin", "senior_management", "hod", "appraiser", "appraisee"];
const blank = (): Partial<Employee> => ({
  employee_no: "",
  name: "",
  email: "",
  department: "",
  designation: "",
  form_type: "office",
  role: "appraisee",
  is_active: true,
  date_joined: new Date().toISOString().slice(0, 10),
});

export default function EmployeeManager({ initial }: { initial: Employee[] }) {
  const router = useRouter();
  const [list, setList] = useState<Employee[]>(initial);
  const [form, setForm] = useState<Partial<Employee>>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const url = editing ? `/api/employees/${editing}` : "/api/employees";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setList((prev) => {
        const idx = prev.findIndex((x) => x.id === data.id);
        if (idx >= 0) {
          const cp = [...prev];
          cp[idx] = data;
          return cp;
        }
        return [...prev, data];
      });
      setForm(blank());
      setEditing(null);
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this employee? They will be excluded from bulk create.")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setList((prev) => prev.map((e) => (e.id === id ? { ...e, is_active: false } : e)));
  }

  async function resetPassword(emp: Employee) {
    const newPw = prompt(
      `Reset password for ${emp.name} (${emp.employee_no}). Enter new password:`,
      "franklin2026",
    );
    if (!newPw) return;
    setResetting(emp.id);
    try {
      const res = await fetch("/api/hr/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: emp.id, new_password: newPw }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      alert(`Password reset for ${emp.name}. They must change it on next login.`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setResetting(null);
    }
  }

  function edit(e: Employee) {
    setForm(e);
    setEditing(e.id);
  }

  return (
    <div className="grid md:grid-cols-[1fr_380px] gap-5">
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost border-b border-rule text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="text-left px-3 py-3">Name</th>
                <th className="text-left px-3 py-3">E/No.</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Dept</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Role</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Form</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">HOD</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Active</th>
                <th className="text-right px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const hod = list.find((x) => x.id === e.hod_id);
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-rule hover:bg-ghost ${!e.is_active ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-3 font-semibold">{e.name}</td>
                    <td className="px-3 py-3 text-slate-600">{e.employee_no}</td>
                    <td className="px-3 py-3 text-slate-600 hidden md:table-cell">
                      {e.department}
                    </td>
                    <td className="px-3 py-3 text-slate-600 hidden lg:table-cell">
                      {ROLE_LABEL[e.role]}
                    </td>
                    <td className="px-3 py-3 capitalize text-slate-600 hidden lg:table-cell">
                      {e.form_type}
                    </td>
                    <td className="px-3 py-3 text-slate-600 hidden md:table-cell">
                      {hod?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">{e.is_active ? "✓" : "—"}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button className="text-navy font-semibold hover:underline mr-2" onClick={() => edit(e)}>
                        Edit
                      </button>
                      <button
                        className="text-amber-700 hover:underline mr-2"
                        onClick={() => resetPassword(e)}
                        disabled={resetting === e.id}
                      >
                        {resetting === e.id ? "…" : "Reset PW"}
                      </button>
                      {e.is_active && (
                        <button
                          className="text-rose-600 hover:underline"
                          onClick={() => deactivate(e.id)}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="card-label">{editing ? "Edit" : "New"}</span>
          <span className="card-title">{editing ? "Update Employee" : "Add Employee"}</span>
        </div>
        <form className="card-body flex flex-col gap-3" onSubmit={save}>
          <Input label="Name" v={form.name ?? ""} on={(v) => setForm({ ...form, name: v })} />
          <Input
            label="Employee Number"
            v={form.employee_no ?? ""}
            on={(v) => setForm({ ...form, employee_no: v })}
          />
          <Input
            label="Email"
            v={form.email ?? ""}
            on={(v) => setForm({ ...form, email: v })}
            type="email"
          />
          <Input
            label="Phone"
            v={form.phone ?? ""}
            on={(v) => setForm({ ...form, phone: v })}
          />
          <Input
            label="Department"
            v={form.department ?? ""}
            on={(v) => setForm({ ...form, department: v })}
          />
          <Input
            label="Designation"
            v={form.designation ?? ""}
            on={(v) => setForm({ ...form, designation: v })}
          />
          <Select
            label="Form Type"
            v={form.form_type ?? "office"}
            on={(v) => setForm({ ...form, form_type: v as FormType })}
            options={[
              { value: "workers", label: "Non-Office / Workers" },
              { value: "office", label: "Office Staff" },
            ]}
          />
          <Select
            label="Role"
            v={form.role ?? "appraisee"}
            on={(v) => setForm({ ...form, role: v as AppRole })}
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
          <Select
            label="Appraiser (supervisor)"
            v={form.appraiser_id ?? ""}
            on={(v) => setForm({ ...form, appraiser_id: v || null })}
            options={[{ value: "", label: "—" }].concat(
              list
                .filter((m) =>
                  ["appraiser", "hod", "senior_management"].includes(m.role) && m.is_active,
                )
                .map((m) => ({ value: m.id, label: `${m.name} (${m.designation})` })),
            )}
          />
          <Select
            label="HOD"
            v={form.hod_id ?? ""}
            on={(v) => setForm({ ...form, hod_id: v || null })}
            options={[{ value: "", label: "—" }].concat(
              list
                .filter((m) => (m.role === "hod" || m.role === "senior_management") && m.is_active)
                .map((m) => ({ value: m.id, label: `${m.name} (${m.department})` })),
            )}
          />
          <Select
            label="Senior Management"
            v={form.sm_id ?? ""}
            on={(v) => setForm({ ...form, sm_id: v || null })}
            options={[{ value: "", label: "—" }].concat(
              list
                .filter((m) => m.role === "senior_management" && m.is_active)
                .map((m) => ({ value: m.id, label: `${m.name} (${m.designation})` })),
            )}
          />
          <Input
            label="Date Joined"
            type="date"
            v={form.date_joined ?? ""}
            on={(v) => setForm({ ...form, date_joined: v })}
          />
          {msg && (
            <div className="text-[13px] rounded bg-emerald-50 text-emerald-800 px-2 py-1.5">
              {msg}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Update" : "Create"}
            </button>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(null);
                  setForm(blank());
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function Input({
  label,
  v,
  on,
  type = "text",
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="field-label">{label}</span>
      <input
        className="border border-rule rounded px-2 py-1.5 text-[13.5px]"
        type={type}
        value={v}
        onChange={(e) => on(e.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  v,
  on,
  options,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="field-label">{label}</span>
      <select
        className="border border-rule rounded px-2 py-1.5 text-[13.5px] bg-white"
        value={v}
        onChange={(e) => on(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
