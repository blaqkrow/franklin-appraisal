type Payload = Record<string, unknown>;

async function post(url: string | undefined, body: Payload) {
  if (!url) return { skipped: true };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export const notify = {
  submittedToHOD: (p: Payload) => post(process.env.PA_SUBMIT_URL, { event: "submitted_to_hod", ...p }),
  submittedToCountersign: (p: Payload) =>
    post(process.env.PA_COUNTERSIGN_URL, { event: "pending_countersign", ...p }),
  hrAccepted: (p: Payload) => post(process.env.PA_HR_ACCEPT_URL, { event: "hr_accepted", ...p }),
  rejected: (p: Payload) => post(process.env.PA_REJECT_URL, { event: "rejected", ...p }),
  acknowledged: (p: Payload) => post(process.env.PA_ACK_URL, { event: "acknowledged", ...p }),
};
