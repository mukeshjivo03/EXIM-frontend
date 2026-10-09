import type { SapDoc, SapGrpo, SapPoFlow } from "@/api/stockStatus";
import { fmtDate, fmtNum } from "@/lib/formatters";

/**
 * State of one step in the SAP flow:
 *   done      – posted in SAP (for every truck, at PO level)
 *   partial   – posted for some trucks only / PO quantity still open
 *   pending   – should be posted but isn't in SAP yet
 *   waiting   – can't happen until an earlier step is done
 *   na        – not needed (credit memo when there was no shortage)
 *   cancelled – document cancelled in SAP
 */
export type StepState = "done" | "partial" | "pending" | "waiting" | "na" | "cancelled";

export interface FlowStep {
  key: string;
  label: string;
  state: StepState;
  /** short status lines shown under the label */
  lines: string[];
}

export const live = (docs: SapDoc[]) => docs.filter((d) => !d.cancelled);

const docLine = (d: SapDoc) => `#${d.doc_num} · ${fmtDate(d.doc_date)}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function creditMemosOf(g: SapGrpo) {
  return [...g.ap_invoices.flatMap((a) => a.credit_memos), ...g.credit_memos];
}

/** The five SAP steps of a single truck (GRPO). */
export function truckSteps(g: SapGrpo): FlowStep[] {
  const step = (key: string, label: string, docs: SapDoc[]): FlowStep => {
    const posted = live(docs);
    if (g.cancelled) return { key, label, state: "na", lines: ["GRPO cancelled"] };
    return posted.length > 0
      ? { key, label, state: "done", lines: posted.map(docLine) }
      : { key, label, state: "pending", lines: ["Not posted in SAP"] };
  };
  const cms = live(creditMemosOf(g));
  const apDone = live(g.ap_invoices).length > 0;

  return [
    {
      key: "grpo",
      label: "GRPO",
      state: g.cancelled ? "cancelled" : "done",
      lines: [docLine(g), g.quantity != null ? `${fmtNum(g.quantity, 2)} ${g.uom ?? ""}` : ""].filter(Boolean),
    },
    step("lc", "Landed Cost", g.landed_costs),
    step("tr", "Inventory Transfer", g.inventory_transfers),
    step("ap", "A/P Invoice", g.ap_invoices),
    cms.length > 0
      ? { key: "cm", label: "Credit Memo", state: "done", lines: cms.map(docLine) }
      : apDone
        ? { key: "cm", label: "Credit Memo", state: "na", lines: ["Not needed"] }
        : { key: "cm", label: "Credit Memo", state: "waiting", lines: ["After A/P invoice"] },
  ];
}

/** The six steps of a whole PO, aggregated over its trucks. */
export function poSteps(flow: Extract<SapPoFlow, { found: true }>): FlowStep[] {
  const trucks = flow.grpos.filter((g) => !g.cancelled);
  const n = trucks.length;
  const ordered = flow.lines.reduce((s, l) => s + (l.quantity ?? 0), 0);
  const open = flow.lines.reduce((s, l) => s + (l.open_quantity ?? 0), 0);
  const uom = flow.lines[0]?.uom ?? "";

  const perTruck = (key: string, label: string, pick: (g: SapGrpo) => SapDoc[]): FlowStep => {
    if (n === 0) return { key, label, state: "waiting", lines: ["After GRPO"] };
    const k = trucks.filter((g) => live(pick(g)).length > 0).length;
    if (k === n) {
      return { key, label, state: "done", lines: n === 1 ? live(pick(trucks[0])).map(docLine) : [`All ${n} trucks`] };
    }
    if (k > 0) return { key, label, state: "partial", lines: [`${k} of ${n} trucks`, `${n - k} not posted`] };
    return { key, label, state: "pending", lines: ["Not posted in SAP"] };
  };

  const cms = trucks.flatMap((g) => live(creditMemosOf(g)));
  const allInvoiced = n > 0 && trucks.every((g) => live(g.ap_invoices).length > 0);

  return [
    {
      key: "po",
      label: "Purchase Order",
      state: flow.cancelled ? "cancelled" : "done",
      lines: [docLine(flow), `${fmtNum(ordered, 2)} ${uom} ordered`],
    },
    n === 0
      ? { key: "grpo", label: "GRPO", state: "pending", lines: ["No truck received yet"] }
      : open > 0 && flow.status === "OPEN"
        ? { key: "grpo", label: "GRPO", state: "partial", lines: [`${plural(n, "truck")} received`, `${fmtNum(open, 2)} ${uom} still open`] }
        : { key: "grpo", label: "GRPO", state: "done", lines: [`${plural(n, "truck")} · fully received`] },
    perTruck("lc", "Landed Cost", (g) => g.landed_costs),
    perTruck("tr", "Inventory Transfer", (g) => g.inventory_transfers),
    perTruck("ap", "A/P Invoice", (g) => g.ap_invoices),
    cms.length > 0
      ? { key: "cm", label: "Credit Memo", state: "done", lines: [`${plural(cms.length, "memo")} raised`] }
      : allInvoiced
        ? { key: "cm", label: "Credit Memo", state: "na", lines: ["Not needed"] }
        : { key: "cm", label: "Credit Memo", state: "waiting", lines: ["After A/P invoice"] },
  ];
}

/** Index of the step that needs attention next (first partial/pending), or -1 when everything is posted. */
export function currentStepIndex(steps: FlowStep[]) {
  return steps.findIndex((s) => s.state === "partial" || s.state === "pending");
}

export type PoStatus = "complete" | "pending" | "no-grpo" | "not-found" | "unknown";

export function poStatus(flow?: SapPoFlow): PoStatus {
  if (!flow) return "unknown";
  if (!flow.found) return "not-found";
  if (flow.grpos.filter((g) => !g.cancelled).length === 0) return "no-grpo";
  return currentStepIndex(poSteps(flow)) === -1 ? "complete" : "pending";
}

export function truckIsPending(g: SapGrpo) {
  return !g.cancelled && currentStepIndex(truckSteps(g)) !== -1;
}
