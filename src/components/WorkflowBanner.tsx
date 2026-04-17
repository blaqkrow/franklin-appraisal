import { WORKFLOW_STEPS, currentStepIndex } from "@/lib/workflow";
import type { AppraisalState } from "@/types";

export default function WorkflowBanner({ state }: { state: AppraisalState }) {
  const idx = currentStepIndex(state);
  const gateFail = state === "gate_fail";
  return (
    <div className="bg-white border border-rule rounded-md px-5 py-4 flex items-center gap-2 text-[13px] text-slate-500 overflow-x-auto">
      {WORKFLOW_STEPS.map((step, i) => {
        const active = i === idx;
        const done = i < idx;
        const color =
          gateFail && i === 1
            ? "bg-accent border-accent text-white"
            : active
              ? "bg-navy border-navy text-white"
              : done
                ? "bg-approve border-approve text-white"
                : "border-rule text-slate-400";
        return (
          <div key={step.label} className="flex items-center gap-2 shrink-0">
            <div
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold ${color}`}
            >
              {i + 1}
            </div>
            <span
              className={`text-[12px] ${active ? "text-navy font-medium" : ""} ${
                gateFail && i === 1 ? "text-accent font-semibold" : ""
              }`}
            >
              {step.label}
            </span>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className="h-px w-10 bg-rule mx-1 shrink-0" />
            )}
          </div>
        );
      })}
      {gateFail && (
        <span className="ml-auto chip bg-red-100 text-red-800 whitespace-nowrap">
          ⚠ Gate Fail
        </span>
      )}
    </div>
  );
}
