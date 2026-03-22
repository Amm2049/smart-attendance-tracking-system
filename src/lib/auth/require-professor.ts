import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function requireProfessor() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: professor, error } = await admin
    .from("professor")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!professor) {
    return {
      userEmail: user.email,
      professor: null,
    };
  }

  return {
    userEmail: user.email,
    professor,
  };
}

