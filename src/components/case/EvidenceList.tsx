import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Search, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createEvidenceAccessUrl, deleteEvidenceObject } from "@/lib/evidence.functions";
import {
  EVIDENCE_CATEGORIES,
  VERIFICATION_STATUSES,
  formatBytes,
  formatDateTime,
  labelFor,
  logAudit,
} from "@/lib/saksya";

export type EvidenceFile = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type EvidenceRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  source: string | null;
  notes: string | null;
  occurred_at: string | null;
  created_at: string;
  verification_status: string;
  location_id: string | null;
  suspect_id: string | null;
  victim_id: string | null;
  witness_id: string | null;
  vehicle_id: string | null;
  evidence_files: EvidenceFile[];
};

export function useEvidence(caseId: string) {
  return useQuery({
    queryKey: ["evidence", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidence")
        .select("*, evidence_files(*)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EvidenceRow[];
    },
  });
}

function statusTone(status: string) {
  if (status === "verified") return "border-primary/50 text-primary";
  if (status === "disputed") return "border-amber-500/50 text-amber-500";
  if (status === "rejected") return "border-destructive/50 text-destructive";
  return "border-border text-muted-foreground";
}

export function EvidenceList({
  caseId,
  canEdit,
  isAdmin,
  nameOf,
}: {
  caseId: string;
  canEdit: boolean;
  isAdmin: boolean;
  nameOf: (kind: "location" | "suspect" | "victim" | "witness" | "vehicle", id: string | null) => string;
}) {
  const queryClient = useQueryClient();
  const evidence = useEvidence(caseId);
  const accessUrl = useServerFn(createEvidenceAccessUrl);
  const deleteObject = useServerFn(deleteEvidenceObject);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState<EvidenceRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (evidence.data ?? []).filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (status !== "all" && row.verification_status !== status) return false;
      if (!q) return true;
      return `${row.title} ${row.description ?? ""} ${row.source ?? ""}`.toLowerCase().includes(q);
    });
  }, [evidence.data, query, category, status]);

  async function openFile(path: string, download: boolean, evidenceId: string) {
    try {
      const { url } = await accessUrl({ data: { storagePath: path, download } });
      await logAudit({
        action: download ? "download" : "view",
        entityType: "evidence_file",
        entityId: evidenceId,
        caseId,
      });
      window.open(url, "_blank", "noopener,noreferrer");
      queryClient.invalidateQueries({ queryKey: ["audit_logs", caseId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  const setVerification = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase
        .from("evidence")
        .update({ verification_status: value })
        .eq("id", id);
      if (error) throw error;
      await logAudit({
        action: "update",
        entityType: "evidence",
        entityId: id,
        caseId,
        details: { verification_status: value },
      });
    },
    onSuccess: () => {
      toast.success("Verification status updated");
      queryClient.invalidateQueries({ queryKey: ["evidence", caseId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", caseId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const removeEvidence = useMutation({
    mutationFn: async (row: EvidenceRow) => {
      for (const file of row.evidence_files ?? []) {
        await deleteObject({ data: { storagePath: file.storage_path } });
      }
      const { error } = await supabase.from("evidence").delete().eq("id", row.id);
      if (error) throw error;
      await logAudit({ action: "delete", entityType: "evidence", entityId: row.id, caseId });
    },
    onSuccess: () => {
      toast.success("Evidence deleted");
      setActive(null);
      queryClient.invalidateQueries({ queryKey: ["evidence", caseId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", caseId] });
      queryClient.invalidateQueries({ queryKey: ["evidence-counts"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div className="space-y-5">
      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1 space-y-2">
          <Label htmlFor="ev-search">Search evidence</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ev-search"
              className="pl-9"
              placeholder="Title, description or source"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="w-44 space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EVIDENCE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44 space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {VERIFICATION_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {evidence.isLoading && <p className="text-sm text-muted-foreground">Loading evidence…</p>}
      {!evidence.isLoading && filtered.length === 0 && (
        <p className="panel p-6 text-sm text-muted-foreground">
          No evidence matches the current filters.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setActive(row)}
            className="panel p-5 text-left transition-colors hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold leading-snug">{row.title}</h4>
              <Badge variant="outline" className={statusTone(row.verification_status)}>
                {labelFor(VERIFICATION_STATUSES, row.verification_status)}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {row.description ?? "No description recorded."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{labelFor(EVIDENCE_CATEGORIES, row.category)}</Badge>
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {row.evidence_files?.length ?? 0} file(s)
              </span>
              <span>{formatDateTime(row.occurred_at ?? row.created_at)}</span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  {active.description ?? "No description recorded."}
                </p>
                <dl className="grid grid-cols-2 gap-3">
                  <Detail label="Category" value={labelFor(EVIDENCE_CATEGORIES, active.category)} />
                  <Detail
                    label="Verification"
                    value={labelFor(VERIFICATION_STATUSES, active.verification_status)}
                  />
                  <Detail label="Source" value={active.source ?? "—"} />
                  <Detail label="Recorded at" value={formatDateTime(active.occurred_at)} />
                  <Detail label="Location" value={nameOf("location", active.location_id)} />
                  <Detail label="Suspect" value={nameOf("suspect", active.suspect_id)} />
                  <Detail label="Victim" value={nameOf("victim", active.victim_id)} />
                  <Detail label="Witness" value={nameOf("witness", active.witness_id)} />
                  <Detail label="Vehicle" value={nameOf("vehicle", active.vehicle_id)} />
                  <Detail label="Logged" value={formatDateTime(active.created_at)} />
                </dl>

                {active.notes && (
                  <div className="rounded-md border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="mt-1">{active.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Attached files
                  </p>
                  {(active.evidence_files ?? []).length === 0 && (
                    <p className="text-muted-foreground">No files attached.</p>
                  )}
                  {(active.evidence_files ?? []).map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.size_bytes)} · {file.mime_type ?? "unknown type"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFile(file.storage_path, false, active.id)}
                        >
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openFile(file.storage_path, true, active.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Links are signed and expire in 5 minutes. Every view and download is audited.
                  </p>
                </div>

                {canEdit && (
                  <div className="space-y-2">
                    <Label className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Update verification
                    </Label>
                    <Select
                      value={active.verification_status}
                      onValueChange={(v) => setVerification.mutate({ id: active.id, value: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VERIFICATION_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => removeEvidence.mutate(active)}
                    disabled={removeEvidence.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete evidence and files
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
