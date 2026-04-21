import { STATE_BADGE, STATE_LABEL } from "@/lib/workflow";
import type { AppraisalState } from "@/types";

export default function StatusBadge({ state }: { state: AppraisalState }) {
  return <span className={`chip ${STATE_BADGE[state]}`}>● {STATE_LABEL[state]}</span>;
}
