import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "evidence";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Signed, short-lived upload target. Files never get a public URL. */
export const createEvidenceUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        caseId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(200),
        sizeBytes: z.number().int().positive().max(200 * 1024 * 1024),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: canEdit } = await context.supabase.rpc("can_edit", {
      _user_id: context.userId,
    });
    if (!canEdit) throw new Error("Not authorised to upload evidence");

    const path = `${data.caseId}/${crypto.randomUUID()}-${safeName(data.fileName)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Could not prepare upload");

    return { path: signed.path, token: signed.token };
  });

/** Short-lived read URL for authorised investigators only. */
export const createEvidenceAccessUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ storagePath: z.string().min(1), download: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: authorized } = await context.supabase.rpc("is_authorized", {
      _user_id: context.userId,
    });
    if (!authorized) throw new Error("Not authorised to access evidence");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(data.storagePath, 300, data.download ? { download: true } : undefined);
    if (error || !signed) throw new Error(error?.message ?? "Could not open file");

    return { url: signed.signedUrl, expiresInSeconds: 300 };
  });

export const deleteEvidenceObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storagePath: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can delete evidence files");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([data.storagePath]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
