import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });
}

export function useMyRole() {
  return useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const roles = (data ?? []).map((r) => r.role as string);
      if (roles.includes("admin")) return "admin" as const;
      if (roles.includes("investigator")) return "investigator" as const;
      if (roles.includes("viewer")) return "viewer" as const;
      return null;
    },
  });
}
