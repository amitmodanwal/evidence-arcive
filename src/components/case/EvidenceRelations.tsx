import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { analyseEvidenceRelations } from "@/lib/analysis.functions";
import { formatDateTime, logAudit } from "@/lib/saksya";

/** Reduce the model output to a flat list of bullet strings. */
function toBullets(summary: string): string[] {
  return summary
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((l) => l.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean);
}

function renderBullet(text: string, index: number) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <li key={index} className="flex gap-2 text-sm leading-relaxed">
      <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-semibold text-foreground">
              {part}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    </li>
  );
}

export function EvidenceRelations({ caseId }: { caseId: string }) {
  const analyse = useServerFn(analyseEvidenceRelations);

  const run = useMutation({
    mutationFn: async () => {
      const result = await analyse({ data: { caseId } });
      await logAudit({
        action: "ai_analysis",
        entityType: "case",
        entityId: caseId,
        caseId,
        details: { evidence_count: result.evidenceCount },
      });
      return result;
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  const bullets = run.data ? toBullets(run.data.summary) : [];

  const download = async () => {
    if (!run.data) return;
    const lines = [
      "Sākṣya — Evidence relation summary",
      `Case ID: ${caseId}`,
      `Evidence items: ${run.data.evidenceCount}`,
      `Generated: ${formatDateTime(run.data.generatedAt)}`,
      "",
      ...bullets.map((b) => `- ${b.replace(/\*\*/g, "")}`),
      "",
      "Note: these links are investigative hypotheses and must be verified independently.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saksya-evidence-summary-${caseId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    await logAudit({
      action: "download_summary",
      entityType: "case",
      entityId: caseId,
      caseId,
      details: { bullets: bullets.length },
    });
  };

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold">Evidence relation analysis</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Generates a bullet-point AI summary of possible links between every evidence item, the
            people, vehicles, locations and timeline events on this case. Findings are investigative
            hypotheses, not conclusions.
          </p>
        </div>
        <div className="flex gap-2">
          {run.data && (
            <Button variant="outline" onClick={download}>
              <Download className="mr-2 h-4 w-4" />
              Download report
            </Button>
          )}
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {run.isPending ? "Analysing…" : "Generate summary"}
          </Button>
        </div>
      </div>

      {run.data && (
        <div className="rounded-md border border-border/70 p-4 text-muted-foreground">
          <p className="text-xs uppercase tracking-wide">
            {run.data.evidenceCount} evidence item(s) · {formatDateTime(run.data.generatedAt)}
          </p>
          <ul className="mt-3 space-y-2">{bullets.map(renderBullet)}</ul>
        </div>
      )}
    </div>
  );
}
