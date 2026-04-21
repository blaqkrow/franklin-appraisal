"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  if (lines.length < 2) return [];
  const headers = splitCsv(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsv(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
}
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') {
        quoted = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

export default function OrgChartImport() {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    const text = await f.text();
    setRows(parseCSV(text));
  }

  async function upload() {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setMsg({
        ok: true,
        text: `Upserted ${data.upserted} employees, routed ${data.routed} rows.`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-body flex flex-col gap-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="text-[13px]"
        />
        {rows.length > 0 && (
          <>
            <div className="text-[13px] text-slate-600">
              Parsed <strong>{rows.length}</strong> rows from {filename}.
            </div>
            <div className="max-h-[280px] overflow-auto border border-rule rounded">
              <table className="text-[12px] w-full">
                <thead className="bg-ghost text-slate-500 text-[11px] tracking-wider uppercase">
                  <tr>
                    {Object.keys(rows[0]).map((h) => (
                      <th key={h} className="px-2 py-1 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 12).map((r, i) => (
                    <tr key={i} className="border-t border-rule">
                      {Object.keys(rows[0]).map((h) => (
                        <td key={h} className="px-2 py-1">
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 12 && (
                <div className="text-[11px] text-slate-500 italic p-2">
                  Showing first 12 of {rows.length}…
                </div>
              )}
            </div>
          </>
        )}
        {msg && (
          <div
            className={`text-[13px] rounded px-3 py-2 ${
              msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
            }`}
          >
            {msg.text}
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="btn btn-primary"
            disabled={busy || rows.length === 0}
            onClick={upload}
          >
            {busy ? "Uploading…" : `Upload ${rows.length ? `(${rows.length})` : ""}`}
          </button>
          <a className="btn btn-ghost" href="/employees">
            Back to Employees
          </a>
        </div>
      </div>
    </div>
  );
}
