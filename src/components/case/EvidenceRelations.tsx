import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { analyseEvidenceRelations } from "@/lib/analysis.functions";
import { formatDateTime, logAudit } from "@/lib/saksya";

function renderLine(line: string, index: number) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("## ")) {
    return (
      <h4 key={index} className="mt-5 font-serif text-lg font-semibold">
        {trimmed.slice(3)}
      </h4>
    );
  }
  if (trimmed.startsWith("# ")) {
    return (
      <h3 key={index} className="mt-5 font-serif text-xl font-semibold">
        {trimmed.slice(2)}
      </h3>
    );
  }
  const bullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
  const text = bullet ? trimmed.slice(2) : trimmed;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  const body = parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
  return (
    <p
      key={index}
      className={bullet ? "mt-1.5 pl-4 text-sm before:-ml-4 before:mr-2 before:content-['•']" : "mt-2 text-sm"}
    >
      {body}
    </p>
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

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold">Evidence relation analysis</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Generates an AI summary of possible links between every evidence item, the people,
            vehicles, locations and timeline events on this case. Findings are investigative
            hypotheses, not conclusions, and must be verified independently.
          </p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {run.isPending ? "Analysing…" : "Generate summary"}
        </Button>
      </div>

      {run.data && (
        <div className="rounded-md border border-border/70 p-4 text-muted-foreground">
          <p className="text-xs uppercase tracking-wide">
            {run.data.evidenceCount} evidence item(s) · {formatDateTime(run.data.generatedAt)}
          </p>
          {run.data.summary.split("\n").map(renderLine)}
        </div>
      )}
    </div>
  );
}
