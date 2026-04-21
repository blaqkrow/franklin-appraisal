import { WORKFLOW_STEPS, currentStepIndex } from "@/lib/workflow";
import type { AppraisalState } from "@/types";

export default function WorkflowBanner({ state }: { state: AppraisalState }) {
  const idx = currentStepIndex(state);
  const rejected = state === "rejected";
  return (
    <div className="bg-white border border-rule rounded-md px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 text-[12px] sm:text-[13px] text-slate-500 overflow-x-auto">
      {WORKFLOW_STEPS.map((step, i) => {
        const active = i === idx;
        const done = i < idx;
        const color =
          rejected && i === idx
            ? "bg-rose-600 border-rose-600 text-white"
            : active
              ? "bg-navy border-navy text-white"
              : done
                ? "bg-approve border-approve text-white"
                : "border-rule text-slate-400";
        return (
          <div key={step.label} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-[11px] font-semibold ${color}`}
            >
              {i + 1}
            </div>
            <span className={`text-[11px] sm:text-[12px] ${active ? "text-navy font-medium" : ""}`}>
              {step.label}
            </span>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className="h-px w-5 sm:w-10 bg-rule mx-0.5 sm:mx-1 shrink-0" />
            )}
          </div>
        );
      })}
      {rejected && (
        <span className="ml-auto chip bg-rose-100 text-rose-800">Rejected</span>
      )}
    </div>
  );
}
