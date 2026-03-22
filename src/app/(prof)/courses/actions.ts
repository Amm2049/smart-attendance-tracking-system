"use server";

import { z } from "zod";
import { requireProfessor } from "@/lib/auth/require-professor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const courseSchema = z.object({
  course_code: z.string().min(2).max(50),
  title: z.string().min(2).max(200),
});

export async function createCourse(input: unknown) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  const data = courseSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("course").insert(data);
  if (error) throw new Error(error.message);
}

export async function updateCourse(course_id: number, input: unknown) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  const data = courseSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("course").update(data).eq("course_id", course_id);
  if (error) throw new Error(error.message);
}

export async function deleteCourse(course_id: number) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("course").delete().eq("course_id", course_id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "This course has sections attached to it. Delete all its sections first, then try again."
      );
    }
    throw new Error(error.message);
  }
}

