"use client";
import { useState } from "react";
import { GUIDELINES } from "@/lib/criteria";

export default function GuidelinesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-rule rounded-md bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-graphite">
          📘 Appraisal Guidelines — Key Reminders
        </span>
        <span className="text-slate-400 text-[13px]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="px-5 pb-5 text-[13px] text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
          {GUIDELINES.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
