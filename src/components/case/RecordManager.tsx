import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { formatDateTime, logAudit } from "@/lib/saksya";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "datetime" | "select" | "number";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export type RecordRow = Record<string, unknown> & { id: string; created_at: string };

type Props = {
  table: string;
  caseId: string;
  title: string;
  hint?: string;
  fields: FieldDef[];
  canEdit: boolean;
  isAdmin: boolean;
  renderRow: (row: RecordRow) => React.ReactNode;
  onChanged?: () => void;
};

function tableRef(table: string) {
  return supabase.from(table as "suspects");
}

export function useCaseRecords(table: string, caseId: string) {
  return useQuery({
    queryKey: [table, caseId],
    queryFn: async () => {
      const { data, error } = await tableRef(table)
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RecordRow[];
    },
  });
}

export function RecordManager({
  table,
  caseId,
  title,
  hint,
  fields,
  canEdit,
  isAdmin,
  renderRow,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const records = useCaseRecords(table, caseId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [table, caseId] });
    queryClient.invalidateQueries({ queryKey: ["timeline", caseId] });
    queryClient.invalidateQueries({ queryKey: ["audit_logs", caseId] });
    onChanged?.();
  };

  const create = useMutation({
    mutationFn: async () => {
      for (const f of fields) {
        if (f.required && !values[f.name]?.trim()) throw new Error(`${f.label} is required`);
      }
      const payload: Record<string, unknown> = { case_id: caseId };
      for (const f of fields) {
        const raw = values[f.name]?.trim();
        payload[f.name] = raw ? (f.type === "number" ? Number(raw) : raw) : null;
      }
      const { data: userData } = await supabase.auth.getUser();
      payload["created_by"] = userData.user?.id ?? null;

      const { data, error } = await tableRef(table)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      const row = data as unknown as RecordRow;
      await logAudit({ action: "create", entityType: table, entityId: row.id, caseId });
      return row;
    },
    onSuccess: () => {
      toast.success(`${title} record added`);
      setOpen(false);
      setValues({});
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tableRef(table).delete().eq("id", id);
      if (error) throw error;
      await logAudit({ action: "delete", entityType: table, entityId: id, caseId });
    },
    onSuccess: () => {
      toast.success("Record deleted");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not delete"),
  });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add {title.toLowerCase()}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {fields.map((f) => (
                  <div key={f.name} className="space-y-2">
                    <Label htmlFor={`${table}-${f.name}`}>
                      {f.label}
                      {f.required ? " *" : ""}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={`${table}-${f.name}`}
                        maxLength={4000}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        value={values[f.name] ?? ""}
                        onValueChange={(v) => setValues({ ...values, [f.name]: v })}
                      >
                        <SelectTrigger id={`${table}-${f.name}`}>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(f.options ?? []).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`${table}-${f.name}`}
                        type={
                          f.type === "datetime"
                            ? "datetime-local"
                            : f.type === "number"
                              ? "number"
                              : "text"
                        }
                        maxLength={300}
                        placeholder={f.placeholder ?? ""}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  Save record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {records.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!records.isLoading && (records.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        )}
        {(records.data ?? []).map((row) => (
          <div
            key={row.id}
            className="rounded-md border border-border/70 bg-background/40 p-4 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{renderRow(row)}</div>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete record"
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Added {formatDateTime(row.created_at)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
