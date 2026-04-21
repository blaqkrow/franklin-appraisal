"use client";
import { useState } from "react";

const KEY_REMINDERS = [
  "Stay within the review period: 01 October (prev year) to 30 September (current year).",
  "Do not refer to past appraisal reports when completing the current one.",
  "Be objective — do not let personal feelings or relationships influence the rating.",
  "Consider each factor independently — do not let one trait influence the overall rating.",
  "Rate each factor individually first; do not decide the overall score in advance.",
  "Only recommend promotion if the employee is qualified and has consistently strong performance.",
  "If supervised for less than 6 months, consult the previous supervisor and record the consultation in the comments.",
  "All forms must be submitted to HR by 7 October.",
];

export default function GuidelinesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-rule rounded-md bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-graphite">
          📘 Appraisal Guidelines — Key Reminders
        </span>
        <span className="text-slate-400 text-[13px]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="px-5 pb-5 text-[13px] text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
          {KEY_REMINDERS.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
