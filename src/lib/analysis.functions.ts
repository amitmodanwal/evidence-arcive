import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** AI-generated relationship summary across all evidence of a case. */
export const analyseEvidenceRelations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ caseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: authorized } = await context.supabase.rpc("is_authorized", {
      _user_id: context.userId,
    });
    if (!authorized) throw new Error("Not authorised to analyse this case");

    const sb = context.supabase;
    const caseId = data.caseId;

    const [caseRow, evidence, suspects, victims, witnesses, vehicles, locations, events] =
      await Promise.all([
        sb.from("cases").select("*").eq("id", caseId).single(),
        sb
          .from("evidence")
          .select("*, evidence_files(file_name, mime_type, size_bytes)")
          .eq("case_id", caseId),
        sb.from("suspects").select("*").eq("case_id", caseId),
        sb.from("victims").select("*").eq("case_id", caseId),
        sb.from("witnesses").select("*").eq("case_id", caseId),
        sb.from("vehicles").select("*").eq("case_id", caseId),
        sb.from("locations").select("*").eq("case_id", caseId),
        sb.from("case_events").select("*").eq("case_id", caseId),
      ]);

    if (!evidence.data || evidence.data.length === 0) {
      throw new Error("No evidence recorded for this case yet.");
    }

    const dossier = JSON.stringify(
      {
        case: caseRow.data,
        evidence: evidence.data,
        suspects: suspects.data ?? [],
        victims: victims.data ?? [],
        witnesses: witnesses.data ?? [],
        vehicles: vehicles.data ?? [],
        locations: locations.data ?? [],
        events: events.data ?? [],
      },
      null,
      1,
    ).slice(0, 120000);

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a forensic case analyst assisting Indian police investigators. From structured case data, infer possible relations BETWEEN evidence items and between evidence and people, vehicles, locations and timeline events. Links are hypotheses, never conclusions. Never invent facts absent from the data. OUTPUT FORMAT: bullet points ONLY. Every line must start with '- '. No headings, no paragraphs, no intro or closing sentence, no numbering, no nested bullets. Each bullet is one short sentence and must begin with a bold tag from this set: **Relation**, **Timeline**, **Gap**, **Next step**. Relation bullets must name the linked items, the connecting factor (time, place, person, vehicle, device or source) and end with '(Confidence: High/Medium/Low)'. Maximum 18 bullets.",
          },
          { role: "user", content: `Case dossier (JSON):\n${dossier}` },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Please retry shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
      throw new Error(`AI request failed [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = json.choices?.[0]?.message?.content?.trim();
    if (!summary) throw new Error("The model returned an empty analysis.");

    return { summary, evidenceCount: evidence.data.length, generatedAt: new Date().toISOString() };
  });
