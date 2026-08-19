import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CaseTimeline } from "@/components/case/CaseTimeline";
import { EvidenceList } from "@/components/case/EvidenceList";
import { EvidenceUploadDialog } from "@/components/case/EvidenceUploadDialog";
import { RecordManager, useCaseRecords } from "@/components/case/RecordManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyRole } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { CASE_STATUSES, formatDateTime, labelFor } from "@/lib/saksya";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  head: () => ({
    meta: [
      { title: "Case workspace — Sākṣya" },
      {
        name: "description",
        content:
          "Investigate a registered case: evidence, timeline, people, vehicles, locations and audit trail.",
      },
      { property: "og:title", content: "Case workspace — Sākṣya" },
      {
        property: "og:description",
        content: "Secure evidence and investigation workspace for a registered case.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CaseWorkspace,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center text-sm">Case not found.</div>,
});

type PersonRow = Record<string, unknown> & { id: string };

function nameField(row: PersonRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "Unnamed";
}

function CaseWorkspace() {
  const { caseId } = Route.useParams();
  const role = useMyRole();
  const canEdit = role.data === "admin" || role.data === "investigator";
  const isAdmin = role.data === "admin";

  const caseQuery = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", caseId).single();
      if (error) throw error;
      return data;
    },
  });

  const suspects = useCaseRecords("suspects", caseId);
  const victims = useCaseRecords("victims", caseId);
  const witnesses = useCaseRecords("witnesses", caseId);
  const vehicles = useCaseRecords("vehicles", caseId);
  const locations = useCaseRecords("locations", caseId);

  const audit = useQuery({
    queryKey: ["audit_logs", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity_type, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const options = (rows: PersonRow[] | undefined, keys: string[]) =>
    (rows ?? []).map((r) => ({ value: r.id, label: nameField(r, keys) }));

  const nameOf = (
    kind: "location" | "suspect" | "victim" | "witness" | "vehicle",
    id: string | null,
  ) => {
    if (!id) return "—";
    const source = {
      location: { rows: locations.data, keys: ["name", "address"] },
      suspect: { rows: suspects.data, keys: ["name"] },
      victim: { rows: victims.data, keys: ["name"] },
      witness: { rows: witnesses.data, keys: ["name"] },
      vehicle: { rows: vehicles.data, keys: ["registration_number", "make_model"] },
    }[kind];
    const row = (source.rows ?? []).find((r) => r.id === id);
    return row ? nameField(row as PersonRow, source.keys) : "—";
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All cases
          </Link>
        </Button>

        <header className="panel p-6">
          {caseQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading case…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">{caseQuery.data?.case_number}</Badge>
                <Badge variant="secondary">
                  {labelFor(CASE_STATUSES, caseQuery.data?.status ?? null)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Opened {formatDateTime(caseQuery.data?.opened_at ?? caseQuery.data?.created_at)}
                </span>
              </div>
              <h1 className="mt-3 font-serif text-3xl font-semibold">{caseQuery.data?.title}</h1>
              {caseQuery.data?.description && (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {caseQuery.data.description}
                </p>
              )}
            </>
          )}
        </header>

        <Tabs defaultValue="evidence" className="mt-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            {isAdmin && <TabsTrigger value="audit">Audit trail</TabsTrigger>}
          </TabsList>

          <TabsContent value="evidence" className="mt-5 space-y-5">
            {canEdit && (
              <div className="flex justify-end">
                <EvidenceUploadDialog
                  caseId={caseId}
                  locations={options(locations.data, ["name", "address"])}
                  suspects={options(suspects.data, ["name"])}
                  victims={options(victims.data, ["name"])}
                  witnesses={options(witnesses.data, ["name"])}
                  vehicles={options(vehicles.data, ["registration_number", "make_model"])}
                />
              </div>
            )}
            <EvidenceList
              caseId={caseId}
              canEdit={canEdit}
              isAdmin={isAdmin}
              nameOf={nameOf}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-5">
            <CaseTimeline caseId={caseId} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="people" className="mt-5 space-y-5">
            <RecordManager
              table="suspects"
              caseId={caseId}
              title="Suspects"
              hint="Accused or persons of interest linked to this case."
              canEdit={canEdit}
              isAdmin={isAdmin}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "contact", label: "Contact" },
                { name: "reference_no", label: "Reference / ID number" },
                { name: "notes", label: "Notes / role in case", type: "textarea" },
              ]}
              renderRow={(row) => (
                <>
                  <p className="font-medium">{nameField(row, ["name"])}</p>
                  <p className="text-muted-foreground">
                    {[row["contact"], row["reference_no"]].filter(Boolean).join(" · ") ||
                      "No further identifiers"}
                  </p>
                  {typeof row["notes"] === "string" && <p className="mt-1">{row["notes"]}</p>}
                </>
              )}
            />
            <RecordManager
              table="victims"
              caseId={caseId}
              title="Victims"
              canEdit={canEdit}
              isAdmin={isAdmin}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "contact", label: "Contact" },
                { name: "reference_no", label: "Reference / ID number" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              renderRow={(row) => (
                <>
                  <p className="font-medium">{nameField(row, ["name"])}</p>
                  <p className="text-muted-foreground">
                    {[row["contact"], row["reference_no"]].filter(Boolean).join(" · ") ||
                      "No further identifiers"}
                  </p>
                </>
              )}
            />
            <RecordManager
              table="witnesses"
              caseId={caseId}
              title="Witnesses"
              hint="Contact details are visible to authorised investigators only."
              canEdit={canEdit}
              isAdmin={isAdmin}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "contact", label: "Contact" },
                { name: "reference_no", label: "Reference / ID number" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              renderRow={(row) => (
                <>
                  <p className="font-medium">{nameField(row, ["name"])}</p>
                  {typeof row["notes"] === "string" && (
                    <p className="mt-1 text-muted-foreground">{row["notes"]}</p>
                  )}
                </>
              )}
            />
            <WitnessStatements caseId={caseId} canEdit={canEdit} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="vehicles" className="mt-5">
            <RecordManager
              table="vehicles"
              caseId={caseId}
              title="Vehicles"
              hint="Registration numbers, ownership and movement notes."
              canEdit={canEdit}
              isAdmin={isAdmin}
              fields={[
                { name: "registration_number", label: "Registration number", required: true },
                { name: "vehicle_type", label: "Vehicle type" },
                { name: "make_model", label: "Make and model" },
                { name: "color", label: "Colour" },
                { name: "owner_reference", label: "Registered owner reference" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              renderRow={(row) => (
                <>
                  <p className="font-medium">
                    {nameField(row, ["registration_number"])}
                    {row["vehicle_type"] ? ` · ${String(row["vehicle_type"])}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {[row["make_model"], row["color"], row["owner_reference"]]
                      .filter(Boolean)
                      .join(" · ") || "No further details"}
                  </p>
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="locations" className="mt-5">
            <RecordManager
              table="locations"
              caseId={caseId}
              title="Locations"
              hint="Crime scene, recovery points and other significant places."
              canEdit={canEdit}
              isAdmin={isAdmin}
              fields={[
                { name: "name", label: "Name", required: true, placeholder: "Crime scene" },
                { name: "address", label: "Address", type: "textarea" },
                { name: "latitude", label: "Latitude", type: "number" },
                { name: "longitude", label: "Longitude", type: "number" },
                { name: "occurred_at", label: "Relevant date & time", type: "datetime" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              renderRow={(row) => {
                const lat = row["latitude"];
                const lng = row["longitude"];
                const hasCoords = typeof lat === "number" && typeof lng === "number";
                return (
                  <>
                    <p className="inline-flex items-center gap-1.5 font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      {nameField(row, ["name"])}
                    </p>
                    {typeof row["address"] === "string" && (
                      <p className="text-muted-foreground">{row["address"]}</p>
                    )}
                    {hasCoords && (
                      <div className="mt-3 overflow-hidden rounded-md border border-border/70">
                        <iframe
                          title={`Map for ${nameField(row, ["name"])}`}
                          loading="lazy"
                          className="h-52 w-full"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.01}%2C${Number(lat) - 0.01}%2C${Number(lng) + 0.01}%2C${Number(lat) + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
                        />
                      </div>
                    )}
                  </>
                );
              }}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="audit" className="mt-5">
              <section className="panel p-5">
                <h3 className="text-lg font-semibold">Audit trail</h3>
                <p className="text-xs text-muted-foreground">
                  Last 100 recorded actions on this case.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {(audit.data ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2"
                    >
                      <span>
                        <Badge variant="secondary" className="mr-2">
                          {row.action}
                        </Badge>
                        {row.entity_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(row.created_at)}
                      </span>
                    </li>
                  ))}
                  {(audit.data?.length ?? 0) === 0 && (
                    <li className="text-muted-foreground">No activity recorded yet.</li>
                  )}
                </ul>
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppShell>
  );
}
