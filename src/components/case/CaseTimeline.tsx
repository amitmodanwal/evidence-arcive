import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";

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
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, logAudit } from "@/lib/saksya";

const EVENT_TYPES = [
  { value: "incident", label: "Incident" },
  { value: "evidence", label: "Evidence" },
  { value: "statement", label: "Statement" },
  { value: "arrest", label: "Arrest" },
  { value: "site_visit", label: "Site visit" },
  { value: "note", label: "Investigation note" },
];

type EventRow = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  occurred_at: string;
};

export function CaseTimeline({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "note",
    occurred_at: "",
  });

  const events = useQuery({
    queryKey: ["timeline", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_events")
        .select("id, event_type, title, description, occurred_at")
        .eq("case_id", caseId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (form.title.trim().length < 3) throw new Error("Event title is required");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("case_events").insert({
        case_id: caseId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type,
        occurred_at: form.occurred_at
          ? new Date(form.occurred_at).toISOString()
          : new Date().toISOString(),
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      await logAudit({ action: "create", entityType: "case_event", caseId });
    },
    onSuccess: () => {
      toast.success("Timeline event added");
      setOpen(false);
      setForm({ title: "", description: "", event_type: "note", occurred_at: "" });
      queryClient.invalidateQueries({ queryKey: ["timeline", caseId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", caseId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save event"),
  });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Case timeline</h3>
          <p className="text-xs text-muted-foreground">
            Chronological reconstruction of the incident and the investigation.
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-4 w-4" />
                Add event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add timeline event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="te-title">Title *</Label>
                  <Input
                    id="te-title"
                    maxLength={200}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event type</Label>
                  <Select
                    value={form.event_type}
                    onValueChange={(v) => setForm({ ...form, event_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="te-when">Occurred at</Label>
                  <Input
                    id="te-when"
                    type="datetime-local"
                    value={form.occurred_at}
                    onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="te-desc">Description</Label>
                  <Textarea
                    id="te-desc"
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  Save event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <ol className="mt-6 space-y-6 border-l border-border pl-6">
        {events.isLoading && <p className="text-sm text-muted-foreground">Loading timeline…</p>}
        {!events.isLoading && (events.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        )}
        {(events.data ?? []).map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[31px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {EVENT_TYPES.find((t) => t.value === event.event_type)?.label ?? event.event_type}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDateTime(event.occurred_at)}
              </span>
            </div>
            <h4 className="mt-1 font-medium">{event.title}</h4>
            {event.description && (
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
