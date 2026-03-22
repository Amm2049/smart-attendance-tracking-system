"use server";

import { z } from "zod";
import { requireProfessor } from "@/lib/auth/require-professor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { relFirst, type RelOne } from "@/lib/supabase/rel";

const sessionSchema = z.object({
  session_date: z.string().min(10),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
});

const studentSchema = z.object({
  student_number: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(200).trim(),
  email: z.union([z.string().email(), z.literal(""), z.undefined()]).transform((value) =>
    value ? value.trim().toLowerCase() : null
  ),
});

const rosterSchema = z.object({
  roster: z.string().min(1),
});

type SessionSectionRow = {
  section_id: number;
  professor_id: number;
};

type SessionLookupRow = {
  session_id: number;
  section: RelOne<SessionSectionRow>;
};

type SectionOwnershipRow = {
  section_id: number;
  professor_id: number;
};

type StudentLookupRow = {
  student_id: number;
  student_number: string;
  name: string;
  email: string | null;
};

type EnrollmentLookupRow = {
  enrollment_id: number;
  student_id: number;
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error("Invalid session time.");
  }

  return hours * 60 + minutes;
}

async function assertOwnedSection(section_id: number) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  const admin = createSupabaseAdminClient();
  const { data: section, error } = await admin
    .from("section")
    .select("section_id, professor_id")
    .eq("section_id", section_id)
    .maybeSingle<SectionOwnershipRow>();
  if (error) throw new Error(error.message);

  if (!section || section.professor_id !== professor.professor_id) {
    throw new Error("Not allowed.");
  }

  return { admin, section };
}

async function ensureStudentAndEnrollment(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  section_id: number,
  input: z.infer<typeof studentSchema>
) {
  const data = input;

  const { data: existingStudent, error: findStudentErr } = await admin
    .from("student")
    .select("student_id, student_number, name, email")
    .eq("student_number", data.student_number)
    .maybeSingle<StudentLookupRow>();
  if (findStudentErr) throw new Error(findStudentErr.message);

  let studentId = existingStudent?.student_id ?? null;

  if (!existingStudent) {
    const { data: createdStudent, error: createStudentErr } = await admin
      .from("student")
      .insert({
        student_number: data.student_number,
        name: data.name,
        email: data.email,
      })
      .select("student_id")
      .maybeSingle<{ student_id: number }>();
    if (createStudentErr) throw new Error(createStudentErr.message);
    if (!createdStudent) throw new Error("Failed to create student.");
    studentId = createdStudent.student_id;
  } else {
    const nextName = existingStudent.name !== data.name ? data.name : existingStudent.name;
    const nextEmail = data.email ?? existingStudent.email;

    if (nextName !== existingStudent.name || nextEmail !== existingStudent.email) {
      const { error: updateStudentErr } = await admin
        .from("student")
        .update({
          name: nextName,
          email: nextEmail,
        })
        .eq("student_id", existingStudent.student_id);
      if (updateStudentErr) throw new Error(updateStudentErr.message);
    }
  }

  const { data: enrollment, error: findEnrollmentErr } = await admin
    .from("enrollment")
    .select("enrollment_id, student_id")
    .eq("section_id", section_id)
    .eq("student_id", studentId)
    .maybeSingle<EnrollmentLookupRow>();
  if (findEnrollmentErr) throw new Error(findEnrollmentErr.message);

  if (enrollment) {
    return { created: false as const };
  }

  const { error: createEnrollmentErr } = await admin.from("enrollment").insert({
    section_id,
    student_id: studentId,
    enrolled_at: new Date().toISOString(),
    status: "enrolled",
  });
  if (createEnrollmentErr) throw new Error(createEnrollmentErr.message);

  return { created: true as const };
}

function parseRoster(roster: string) {
  const lines = roster
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Upload or paste at least one student row.");
  }

  const rows = lines.map((line) => line.split(",").map((part) => part.trim()));
  const firstRow = rows[0] ?? [];
  const normalizedHeaders = firstRow.map((value) => value.toLowerCase());
  const hasHeader =
    normalizedHeaders.includes("student_number") || normalizedHeaders.includes("name");

  if (hasHeader) {
    const studentNumberIndex = normalizedHeaders.indexOf("student_number");
    const nameIndex = normalizedHeaders.indexOf("name");
    const emailIndex = normalizedHeaders.indexOf("email");

    if (studentNumberIndex === -1 || nameIndex === -1) {
      throw new Error("CSV header must include student_number and name.");
    }

    return rows.slice(1).map((row, index) => {
      const student_number = row[studentNumberIndex] ?? "";
      const name = row[nameIndex] ?? "";
      const email = emailIndex >= 0 ? (row[emailIndex] ?? "") : "";

      if (!student_number || !name) {
        throw new Error(`Row ${index + 2} must include student_number and name.`);
      }

      return studentSchema.parse({ student_number, name, email });
    });
  }

  return rows.map((row, index) => {
    const [student_number = "", name = "", email = ""] = row;

    if (!student_number || !name) {
      throw new Error(`Line ${index + 1} must be student_number,name,email.`);
    }

    return studentSchema.parse({ student_number, name, email });
  });
}

export async function createSession(section_id: number, input: unknown) {
  const { admin } = await assertOwnedSection(section_id);
  const data = sessionSchema.parse(input);
  const startMinutes = timeToMinutes(data.start_time);
  const endMinutes = timeToMinutes(data.end_time);

  if (endMinutes <= startMinutes) {
    throw new Error("Session end time must be later than the start time.");
  }

  const { error } = await admin.from("classsession").insert({
    section_id,
    session_date: data.session_date,
    start_time: data.start_time,
    end_time: data.end_time,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function deleteSession(session_id: number) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  const admin = createSupabaseAdminClient();
  const { data: session, error: sessErr } = await admin
    .from("classsession")
    .select("session_id, section:section_id(section_id, professor_id)")
    .eq("session_id", session_id)
    .maybeSingle<SessionLookupRow>();
  if (sessErr) throw new Error(sessErr.message);

  const profId = relFirst(session?.section)?.professor_id;

  if (!session || profId !== professor.professor_id) {
    throw new Error("Not allowed.");
  }

  const { error } = await admin.from("classsession").delete().eq("session_id", session_id);
  if (error) throw new Error(error.message);
}

export async function enrollStudent(section_id: number, input: unknown) {
  const { admin } = await assertOwnedSection(section_id);
  return await ensureStudentAndEnrollment(admin, section_id, studentSchema.parse(input));
}

export async function importStudents(section_id: number, input: unknown) {
  const { admin } = await assertOwnedSection(section_id);
  const { roster } = rosterSchema.parse(input);
  const students = parseRoster(roster);

  if (students.length === 0) {
    return { imported: 0, createdCount: 0, existingCount: 0 };
  }

  // Step 1: Batch upsert all students by student_number (update name/email if changed)
  const { data: upsertedStudents, error: upsertErr } = await admin
    .from("student")
    .upsert(
      students.map((s) => ({
        student_number: s.student_number,
        name: s.name,
        email: s.email,
      })),
      { onConflict: "student_number" }
    )
    .select("student_id, student_number");
  if (upsertErr) throw new Error(upsertErr.message);
  if (!upsertedStudents || upsertedStudents.length === 0) {
    throw new Error("Failed to upsert students.");
  }

  const allStudentIds = upsertedStudents.map((s) => s.student_id);

  // Step 2: Fetch which students are already enrolled in this section
  const { data: existingEnrollments, error: enrollErr } = await admin
    .from("enrollment")
    .select("student_id")
    .eq("section_id", section_id)
    .in("student_id", allStudentIds);
  if (enrollErr) throw new Error(enrollErr.message);

  const existingStudentIdSet = new Set(
    (existingEnrollments ?? []).map((e) => e.student_id)
  );
  const newStudentIds = allStudentIds.filter((id) => !existingStudentIdSet.has(id));

  // Step 3: Batch insert only the new enrollments
  if (newStudentIds.length > 0) {
    const now = new Date().toISOString();
    const { error: insertErr } = await admin.from("enrollment").insert(
      newStudentIds.map((student_id) => ({
        section_id,
        student_id,
        enrolled_at: now,
        status: "enrolled",
      }))
    );
    if (insertErr) throw new Error(insertErr.message);
  }

  return {
    imported: students.length,
    createdCount: newStudentIds.length,
    existingCount: existingStudentIdSet.size,
  };
}

export async function removeEnrollment(enrollment_id: number) {
  const { professor } = await requireProfessor();
  if (!professor) throw new Error("Professor not seeded.");

  const admin = createSupabaseAdminClient();
  const { data: enrollment, error: enrollmentErr } = await admin
    .from("enrollment")
    .select("enrollment_id, section:section_id(section_id, professor_id)")
    .eq("enrollment_id", enrollment_id)
    .maybeSingle<{ enrollment_id: number; section: RelOne<SessionSectionRow> }>();
  if (enrollmentErr) throw new Error(enrollmentErr.message);

  const profId = relFirst(enrollment?.section)?.professor_id;

  if (!enrollment || profId !== professor.professor_id) {
    throw new Error("Not allowed.");
  }

  const { error } = await admin.from("enrollment").delete().eq("enrollment_id", enrollment_id);
  if (error) throw new Error(error.message);
}

export async function removeAllEnrollments(section_id: number) {
  const { admin } = await assertOwnedSection(section_id);

  // Fetch all enrollment IDs for this section
  const { data: enrollments, error: fetchErr } = await admin
    .from("enrollment")
    .select("enrollment_id")
    .eq("section_id", section_id);
  if (fetchErr) throw new Error(fetchErr.message);
  if (!enrollments || enrollments.length === 0) return { removed: 0 };

  const enrollmentIds = enrollments.map((e) => e.enrollment_id);

  // Block if any enrollment has attendance records (FK: attendancerecord.enrollment_id)
  const { data: records, error: checkErr } = await admin
    .from("attendancerecord")
    .select("attendance_id")
    .in("enrollment_id", enrollmentIds)
    .limit(1);
  if (checkErr) throw new Error(checkErr.message);
  if (records && records.length > 0) {
    throw new Error(
      "Some students have attendance records — their enrollments cannot be removed. Delete their attendance records first, or remove those students individually."
    );
  }

  // Batch delete all enrollments for this section
  const { error: deleteErr } = await admin
    .from("enrollment")
    .delete()
    .eq("section_id", section_id);
  if (deleteErr) throw new Error(deleteErr.message);

  return { removed: enrollments.length };
}
