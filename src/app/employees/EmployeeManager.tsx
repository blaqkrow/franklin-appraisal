"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Employee, FormType } from "@/types";

const blank = (): Partial<Employee> => ({
  employeeId: "",
  name: "",
  email: "",
  department: "",
  designation: "",
  formType: "office_staff",
  isActive: true,
  joinedDate: new Date().toISOString().slice(0, 10),
});

export default function EmployeeManager({ initial }: { initial: Employee[] }) {
  const router = useRouter();
  const [list, setList] = useState<Employee[]>(initial);
  const [form, setForm] = useState<Partial<Employee>>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const data = (await res.json()) as Employee;
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
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this employee? They will be excluded from bulk create.")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setList((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: false } : e)));
  }

  function edit(e: Employee) {
    setForm(e);
    setEditing(e.id);
  }

  const managers = list.filter((e) =>
    /manager|head|director/i.test(e.designation),
  );

  return (
    <div className="grid md:grid-cols-[1fr_380px] gap-6">
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost border-b border-rule text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Emp ID</th>
                <th className="text-left px-4 py-3">Dept</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Form</th>
                <th className="text-left px-4 py-3">HOD</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const hod = list.find((x) => x.id === e.hodId);
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-rule hover:bg-ghost ${
                      !e.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.employeeId}</td>
                    <td className="px-4 py-3 text-slate-600">{e.department}</td>
                    <td className="px-4 py-3 text-slate-600">{e.designation}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {e.formType.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{hod?.name ?? "—"}</td>
                    <td className="px-4 py-3">{e.isActive ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-navy font-semibold hover:underline mr-3"
                        onClick={() => edit(e)}
                      >
                        Edit
                      </button>
                      {e.isActive && (
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
          <Input label="Full Name" v={form.name} on={(v) => setForm({ ...form, name: v })} />
          <Input label="Employee ID" v={form.employeeId} on={(v) => setForm({ ...form, employeeId: v })} />
          <Input label="Email" v={form.email} on={(v) => setForm({ ...form, email: v })} type="email" />
          <Input label="Department" v={form.department} on={(v) => setForm({ ...form, department: v })} />
          <Input label="Designation" v={form.designation} on={(v) => setForm({ ...form, designation: v })} />
          <Select
            label="Form Type"
            v={form.formType ?? "office_staff"}
            on={(v) => setForm({ ...form, formType: v as FormType })}
            options={[
              { value: "production_worker", label: "Production Worker" },
              { value: "office_staff", label: "Office Staff" },
            ]}
          />
          <Select
            label="HOD"
            v={form.hodId ?? ""}
            on={(v) => setForm({ ...form, hodId: v || undefined })}
            options={[{ value: "", label: "— none —" }].concat(
              managers.map((m) => ({ value: m.id, label: `${m.name} (${m.department})` })),
            )}
          />
          <Select
            label="Countersigner (SM)"
            v={form.countersignerId ?? ""}
            on={(v) => setForm({ ...form, countersignerId: v || undefined })}
            options={[{ value: "", label: "— none —" }].concat(
              list
                .filter((m) => /director|md|senior/i.test(m.designation))
                .map((m) => ({ value: m.id, label: `${m.name} (${m.designation})` })),
            )}
          />
          <Input
            label="Joined Date"
            v={form.joinedDate}
            on={(v) => setForm({ ...form, joinedDate: v })}
            type="date"
          />
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
  v?: string;
  on: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="field-label">{label}</span>
      <input
        className="border border-rule rounded px-2 py-1.5 text-[13.5px]"
        type={type}
        value={v ?? ""}
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
