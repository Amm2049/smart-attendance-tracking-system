"use server";

import { z } from "zod";
import { requireProfessor } from "@/lib/auth/require-professor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const sectionSchema = z.object({
  course_id: z.coerce.number().int().positive(),
  term: z.string().min(1).max(50),
  section: z.string().min(1).max(50),
  schedule: z.string().min(1).max(100),
  room: z.string().max(100).optional().or(z.literal("")),
  allowed_radius_m: z.coerce.number().int().positive().default(100),
  classroom_lat: z.number(),
  classroom_lng: z.number(),
});

export async function createSection(input: unknown) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  const data = sectionSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("section").insert({
    ...data,
    professor_id: professor.professor_id,
    room: data.room ? data.room : null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSection(section_id: number) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  // Only allow deleting owned sections
  const admin = createSupabaseAdminClient();
  const { data: section, error: readErr } = await admin
    .from("section")
    .select("section_id, professor_id")
    .eq("section_id", section_id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  if (!section || section.professor_id !== professor.professor_id) {
    throw new Error("Not allowed.");
  }
  const { error } = await admin.from("section").delete().eq("section_id", section_id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "This section still has sessions or enrollments. Remove them first, then try again."
      );
    }
    throw new Error(error.message);
  }
}

