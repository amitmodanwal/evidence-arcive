import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCaseRecords } from "@/components/case/RecordManager";
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

type StatementRow = {
  id: string;
  statement: string;
  statement_date: string;
  witness_id: string | null;
};

export function WitnessStatements({
  caseId,
  canEdit,
  isAdmin,
}: {
  caseId: string;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const witnesses = useCaseRecords("witnesses", caseId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ witness_id: "", statement: "", statement_date: "" });

  const statements = useQuery({
    queryKey: ["witness_statements", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("witness_statements")
        .select("id, statement, statement_date, witness_id")
        .eq("case_id", caseId)
        .order("statement_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StatementRow[];
    },
  });

  const witnessName = (id: string | null) => {
    if (!id) return "Unattributed";
    const row = (witnesses.data ?? []).find((w) => w.id === id);
    const name = row?.["name"];
    return typeof name === "string" ? name : "Unattributed";
  };

  const create = useMutation({
    mutationFn: async () => {
      if (form.statement.trim().length < 5) throw new Error("Statement text is required");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("witness_statements").insert({
        case_id: caseId,
        witness_id: form.witness_id || null,
        statement: form.statement.trim(),
        statement_date: form.statement_date
          ? new Date(form.statement_date).toISOString()
          : new Date().toISOString(),
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      await logAudit({ action: "create", entityType: "witness_statement", caseId });
    },
    onSuccess: () => {
      toast.success("Statement recorded");
      setOpen(false);
      setForm({ witness_id: "", statement: "", statement_date: "" });
      queryClient.invalidateQueries({ queryKey: ["witness_statements", caseId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", caseId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("witness_statements").delete().eq("id", id);
      if (error) throw error;
      await logAudit({ action: "delete", entityType: "witness_statement", entityId: id, caseId });
    },
    onSuccess: () => {
      toast.success("Statement deleted");
      queryClient.invalidateQueries({ queryKey: ["witness_statements", caseId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not delete"),
  });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Witness statements</h3>
          <p className="text-xs text-muted-foreground">
            Recorded statements are restricted to authorised investigators.
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-4 w-4" />
                Record statement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record witness statement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Witness</Label>
                  <Select
                    value={form.witness_id}
                    onValueChange={(v) =>
                      setForm({ ...form, witness_id: v === "__none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select witness" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unattributed</SelectItem>
                      {(witnesses.data ?? []).map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {String(w["name"] ?? "Unnamed")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-date">Statement date</Label>
                  <Input
                    id="ws-date"
                    type="datetime-local"
                    value={form.statement_date}
                    onChange={(e) => setForm({ ...form, statement_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-text">Statement *</Label>
                  <Textarea
                    id="ws-text"
                    rows={6}
                    maxLength={8000}
                    value={form.statement}
                    onChange={(e) => setForm({ ...form, statement: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  Save statement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {(statements.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No statements recorded yet.</p>
        )}
        {(statements.data ?? []).map((row) => (
          <div
            key={row.id}
            className="rounded-md border border-border/70 bg-background/40 p-4 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{witnessName(row.witness_id)}</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{row.statement}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(row.statement_date)}
                </p>
              </div>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete statement"
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
