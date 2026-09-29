// Human-readable locations, e.g. "People › Offboarding › Voluntary departure".

export const BREADCRUMB_SEPARATOR = " › ";

/** Folder names whose readable form isn't just sentence case. */
const FOLDER_LABELS: Record<string, string> = {
  "cs-and-onboarding": "CS and onboarding",
  "posthog-com": "posthog.com",
  "post-mortems": "Post-mortems",
  "cross-selling": "Cross-selling",
  "use-case-selling": "Use-case selling",
  "ramp-up": "Ramp-up",
  ai: "AI",
  sdks: "SDKs",
  revops: "RevOps",
};

/** The handbook areas a document sits in, from its folders: "growth/sales/refunds" → ["Growth", "Sales"]. */
export function areaFor(documentId: string): string[] {
  return documentId.split("/").slice(0, -1).map(folderLabel);
}

function folderLabel(folder: string): string {
  const known = FOLDER_LABELS[folder];
  if (known) return known;
  const words = folder.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Area plus heading path, skipping a step that repeats the one before ("SDKs › SDKs"). */
export function buildBreadcrumb(area: readonly string[], headingPath: readonly string[]): string[] {
  const crumbs: string[] = [];
  for (const crumb of [...area, ...headingPath]) {
    if (crumbs.at(-1)?.toLowerCase() !== crumb.toLowerCase()) crumbs.push(crumb);
  }
  return crumbs;
}
