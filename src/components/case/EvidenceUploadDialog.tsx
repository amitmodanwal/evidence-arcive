import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createEvidenceUploadUrl } from "@/lib/evidence.functions";
import {
  EVIDENCE_CATEGORIES,
  VERIFICATION_STATUSES,
  formatBytes,
  isAllowedFile,
  logAudit,
} from "@/lib/saksya";

type Option = { value: string; label: string };

const schema = z.object({
  title: z.string().trim().min(3, "Title is required").max(160),
  description: z.string().trim().max(2000),
  category: z.string().min(1),
  source: z.string().trim().max(160),
  notes: z.string().trim().max(2000),
});

export function EvidenceUploadDialog({
  caseId,
  locations,
  suspects,
  victims,
  witnesses,
  vehicles,
}: {
  caseId: string;
  locations: Option[];
  suspects: Option[];
  victims: Option[];
  witnesses: Option[];
  vehicles: Option[];
}) {
  const queryClient = useQueryClient();
  const getUploadUrl = useServerFn(createEvidenceUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "document",
    source: "",
    occurred_at: "",
    location_id: "",
    suspect_id: "",
    victim_id: "",
    witness_id: "",
    vehicle_id: "",
    verification_status: "pending",
    notes: "",
    legally_obtained: true,
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    for (const file of Array.from(list)) {
      const problem = isAllowedFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      next.push(file);
    }
    setFiles((prev) => [...prev, ...next]);
  }

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      if (!form.legally_obtained) {
        throw new Error("Evidence must be confirmed as lawfully obtained before it can be stored");
      }
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { data: evidence, error } = await supabase
        .from("evidence")
        .insert({
          case_id: caseId,
          title: parsed.title,
          description: parsed.description || null,
          category: parsed.category,
          source: parsed.source || null,
          notes: parsed.notes || null,
          occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : null,
          location_id: form.location_id || null,
          suspect_id: form.suspect_id || null,
          victim_id: form.victim_id || null,
          witness_id: form.witness_id || null,
          vehicle_id: form.vehicle_id || null,
          verification_status: form.verification_status,
          legally_obtained: true,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;

      for (const file of files) {
        const { path, token } = await getUploadUrl({
          data: { caseId, fileName: file.name, sizeBytes: file.size },
        });
        const upload = await supabase.storage.from("evidence").uploadToSignedUrl(path, token, file);
        if (upload.error) throw upload.error;
        const { error: fileError } = await supabase.from("evidence_files").insert({
          evidence_id: evidence.id,
          case_id: caseId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
        });
        if (fileError) throw fileError;
      }

      await supabase.from("case_events").insert({
        case_id: caseId,
        event_type: "evidence",
        title: `Evidence logged: ${parsed.title}`,
        description: parsed.description || null,
        occurred_at: form.occurred_at
          ? new Date(form.occurred_at).toISOString()
          : new Date().toISOString(),
        evidence_id: evidence.id,
        location_id: form.location_id || null,
        created_by: userId,
      });

      await logAudit({
        action: "upload",
        entityType: "evidence",
        entityId: evidence.id,
        caseId,
        details: { title: parsed.title, files: files.length },
      });

      return evidence;
    },
    onSuccess: () => {
      toast.success("Evidence recorded");
      setOpen(false);
      setFiles([]);
      setForm({
        title: "",
        description: "",
        category: "document",
        source: "",
        occurred_at: "",
        location_id: "",
        suspect_id: "",
        victim_id: "",
        witness_id: "",
        vehicle_id: "",
        verification_status: "pending",
        notes: "",
        legally_obtained: true,
      });
      queryClient.invalidateQueries({ queryKey: ["evidence", caseId] });
      queryClient.invalidateQueries({ queryKey: ["timeline", caseId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", caseId] });
      queryClient.invalidateQueries({ queryKey: ["evidence-counts"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const relationSelect = (
    label: string,
    key: "location_id" | "suspect_id" | "victim_id" | "witness_id" | "vehicle_id",
    options: Option[],
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={form[key]}
        onValueChange={(v) => setForm({ ...form, [key]: v === "__none" ? "" : v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">None</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="mr-2 h-4 w-4" />
          Add evidence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log new evidence</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`rounded-lg border border-dashed p-6 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground">
            Audio, video, images, PDF and office documents up to 100 MB each
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm"
              >
                <span className="truncate">{f.name}</span>
                <span className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
                  {formatBytes(f.size)}
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ev-title">Evidence title *</Label>
            <Input
              id="ev-title"
              maxLength={160}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea
              id="ev-desc"
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-source">Source</Label>
            <Input
              id="ev-source"
              maxLength={160}
              placeholder="Seized from, submitted by…"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-when">Date & time of evidence</Label>
            <Input
              id="ev-when"
              type="datetime-local"
              value={form.occurred_at}
              onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Verification status</Label>
            <Select
              value={form.verification_status}
              onValueChange={(v) => setForm({ ...form, verification_status: v })}
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
          {relationSelect("Location", "location_id", locations)}
          {relationSelect("Related suspect", "suspect_id", suspects)}
          {relationSelect("Related victim", "victim_id", victims)}
          {relationSelect("Related witness", "witness_id", witnesses)}
          {relationSelect("Related vehicle", "vehicle_id", vehicles)}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ev-notes">Notes</Label>
            <Textarea
              id="ev-notes"
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border border-border/70 p-3 text-sm">
          <Checkbox
            checked={form.legally_obtained}
            onCheckedChange={(v) => setForm({ ...form, legally_obtained: v === true })}
          />
          <span>
            I confirm this material — including any call records or personal data — was lawfully
            obtained and I am authorised to store it in this case file.
          </span>
        </label>

        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "Saving…" : "Save evidence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
