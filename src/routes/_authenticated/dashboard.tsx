import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FolderPlus, Files, Clock3, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
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
import { useMyRole } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { CASE_STATUSES, formatDateTime, labelFor, logAudit } from "@/lib/saksya";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Case dashboard — Sākṣya" },
      { name: "description", content: "All active investigations and their evidence counts." },
      { property: "og:title", content: "Case dashboard — Sākṣya" },
      { property: "og:description", content: "All active investigations and evidence counts." },
    ],
  }),
  component: Dashboard,
});

const caseSchema = z.object({
  case_number: z.string().trim().min(2, "Case number required").max(60),
  title: z.string().trim().min(3, "Title required").max(160),
  description: z.string().trim().max(2000).optional(),
  status: z.string(),
});

function Dashboard() {
  const queryClient = useQueryClient();
  const { data: role } = useMyRole();
  const canEdit = role === "admin" || role === "investigator";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    case_number: "",
    title: "",
    description: "",
    status: "open",
  });

  const cases = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const counts = useQuery({
    queryKey: ["evidence-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("evidence").select("id, case_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.case_id] = (map[row.case_id] ?? 0) + 1;
      return map;
    },
  });

  const createCase = useMutation({
    mutationFn: async () => {
      const parsed = caseSchema.parse(form);
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("cases")
        .insert({
          case_number: parsed.case_number,
          title: parsed.title,
          status: parsed.status,
          description: parsed.description ?? null,
          created_by: userData.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        action: "create",
        entityType: "case",
        entityId: data.id,
        caseId: data.id,
        details: { case_number: data.case_number },
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Case created");
      setOpen(false);
      setForm({ case_number: "", title: "", description: "", status: "open" });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not create the case"),
  });

  const total = cases.data?.length ?? 0;
  const totalEvidence = Object.values(counts.data ?? {}).reduce((a, b) => a + b, 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Investigation overview</p>
          <h1 className="mt-1 text-3xl font-semibold">Case dashboard</h1>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="mr-2 h-4 w-4" />
                New case
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register a new case</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case_number">Case / FIR number</Label>
                  <Input
                    id="case_number"
                    maxLength={60}
                    value={form.case_number}
                    onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    maxLength={160}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CASE_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createCase.mutate()} disabled={createCase.isPending}>
                  Create case
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Files className="h-4 w-4 text-primary" />} label="Cases" value={total} />
        <StatCard
          icon={<ShieldAlert className="h-4 w-4 text-accent" />}
          label="Evidence items"
          value={totalEvidence}
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4 text-muted-foreground" />}
          label="Open cases"
          value={(cases.data ?? []).filter((c) => c.status !== "closed").length}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cases.isLoading && <p className="text-sm text-muted-foreground">Loading cases…</p>}
        {!cases.isLoading && total === 0 && (
          <p className="text-sm text-muted-foreground">
            No cases yet. Register the first case to begin logging evidence.
          </p>
        )}
        {(cases.data ?? []).map((c) => (
          <Link
            key={c.id}
            to="/cases/$caseId"
            params={{ caseId: c.id }}
            className="panel block p-5 transition-colors hover:border-primary/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-primary">{c.case_number}</span>
              <Badge variant="secondary">{labelFor(CASE_STATUSES, c.status)}</Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{c.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {c.description || "No description recorded."}
            </p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{counts.data?.[c.id] ?? 0} evidence items</span>
              <span>Opened {formatDateTime(c.opened_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="label-caps">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
