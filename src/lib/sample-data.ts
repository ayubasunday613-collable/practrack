// Stage 1 sample records. Everything here is DEMO data used only to illustrate the UI.
// In Stage 2 these will be replaced by queries against the database.

export type SubmissionStatus =
  "draft" | "submitted" | "reviewed" | "awaiting" | "approved" | "returned";

export const statusMeta: Record<
  SubmissionStatus,
  { label: string; tone: "muted" | "info" | "warning" | "success" | "danger" }
> = {
  draft: { label: "Draft", tone: "muted" },
  submitted: { label: "Submitted", tone: "info" },
  reviewed: { label: "AI suggestions ready", tone: "info" },
  awaiting: { label: "Awaiting assessment", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  returned: { label: "Returned", tone: "danger" },
};

export const institution = {
  name: "Petroleum Training Institute",
  short: "PTI",
  location: "Effurun, Delta State",
};

export const departments = [
  "Petroleum Engineering Technology",
  "Chemical Engineering Technology",
  "Mechanical Engineering Technology",
  "Electrical/Electronic Engineering Technology",
  "Industrial Safety & Environmental Technology",
  "Science Laboratory Technology",
];

export const programmes = ["National Diploma (ND)", "Higher National Diploma (HND)"];
export const levels = ["ND I", "ND II", "HND I", "HND II"];
