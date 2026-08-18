import { supabase } from "@/integrations/supabase/client";

export const EVIDENCE_CATEGORIES = [
  { value: "audio", label: "Audio recording" },
  { value: "document", label: "Document / PDF" },
  { value: "fir", label: "FIR / case report" },
  { value: "statement", label: "Witness statement" },
  { value: "call_record", label: "Call record / metadata" },
  { value: "photo", label: "Photograph" },
  { value: "video", label: "Video" },
  { value: "other", label: "Other" },
] as const;

export const VERIFICATION_STATUSES = [
  { value: "pending", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "disputed", label: "Disputed" },
  { value: "rejected", label: "Rejected" },
] as const;

export const CASE_STATUSES = [
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under investigation" },
  { value: "chargesheet_filed", label: "Chargesheet filed" },
  { value: "closed", label: "Closed" },
] as const;

export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const ALLOWED_MIME_PREFIXES = [
  "audio/",
  "video/",
  "image/",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
];

export function isAllowedFile(file: File) {
  if (file.size > MAX_FILE_BYTES) return "File is larger than 100 MB";
  const ok = ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p));
  if (!ok) return "Unsupported file type";
  return null;
}

export function labelFor(
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
) {
  return list.find((i) => i.value === value)?.label ?? value ?? "—";
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export async function logAudit(entry: {
  action: string;
  entityType: string;
  entityId?: string | null;
  caseId?: string | null;
  details?: Record<string, unknown>;
}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    user_id: data.user.id,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    case_id: entry.caseId ?? null,
    details: (entry.details ?? {}) as never,
  });
}
