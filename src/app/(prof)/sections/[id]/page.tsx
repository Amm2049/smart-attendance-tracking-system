import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfessor } from "@/lib/auth/require-professor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimeAmPm, getLocalDateISO } from "@/lib/datetime/local";
import { SectionDetailClient } from "./ui";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { relFirst, type RelOne } from "@/lib/supabase/rel";

type CourseRow = {
  course_code: string;
};

type SectionRow = {
  section_id: number;
  professor_id: number;
  term: string;
  section: string;
  schedule: string;
  room: string | null;
  allowed_radius_m: number;
  course: RelOne<CourseRow>;
};

type SessionRow = {
  session_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
};

type StudentRow = {
  student_number: string;
  name: string;
  email: string | null;
};

type EnrollmentRow = {
  enrollment_id: number;
  enrolled_at: string;
  status: string;
  student_id: number;
  student: RelOne<StudentRow>;
};

export default async function SectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { professor } = await requireProfessor();
  if (!professor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Section</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Professor record not found. Seed <span className="font-mono">PROFESSOR</span> first.
        </CardContent>
      </Card>
    );
  }

  const { id } = await params;
  const sectionId = Number(id);
  if (!Number.isFinite(sectionId)) notFound();

  const admin = createSupabaseAdminClient();

  const { data: section, error: sectionErr } = await admin
    .from("section")
    .select(
      "section_id, professor_id, term, section, schedule, room, allowed_radius_m, course:course_id(course_code)"
    )
    .eq("section_id", sectionId)
    .maybeSingle<SectionRow>();
  if (sectionErr) throw new Error(sectionErr.message);

  if (!section || section.professor_id !== professor.professor_id) notFound();

  const { data: sessions, error: sessionsErr } = await admin
    .from("classsession")
    .select("session_id, session_date, start_time, end_time")
    .eq("section_id", sectionId)
    .order("session_id", { ascending: true })
    .returns<SessionRow[]>();
  if (sessionsErr) throw new Error(sessionsErr.message);

  const { data: enrollments, error: enrollmentsErr } = await admin
    .from("enrollment")
    .select("enrollment_id, enrolled_at, status, student_id, student:student_id(student_number, name, email)")
    .eq("section_id", sectionId)
    .order("enrolled_at", { ascending: true })
    .returns<EnrollmentRow[]>();
  if (enrollmentsErr) throw new Error(enrollmentsErr.message);

  // Compute per-student attendance counts in bulk (3 queries total, not N×3)
  const sessionIds = (sessions ?? []).map((s) => s.session_id);
  const totalSessions = sessionIds.length;
  const attendedByStudentId = new Map<number, number>();
  if (sessionIds.length > 0) {
    const { data: attRecords, error: attErr } = await admin
      .from("attendancerecord")
      .select("student_id")
      .in("session_id", sessionIds);
    if (attErr) throw new Error(attErr.message);
    for (const rec of attRecords ?? []) {
      attendedByStudentId.set(
        rec.student_id,
        (attendedByStudentId.get(rec.student_id) ?? 0) + 1
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {relFirst(section.course)?.course_code ?? "Course"} - Section {section.section}
            </h1>
            <Badge variant="secondary">{section.term}</Badge>
          </div>
          <p className="text-[15px] text-muted-foreground md:text-base">{section.schedule}</p>
        </div>
        <Link className="text-sm underline underline-offset-4" href="/sections">
          Back to sections
        </Link>
      </div>

      <SectionDetailClient
        section={{
          section_id: section.section_id,
          allowed_radius_m: section.allowed_radius_m,
          room: section.room,
        }}
        students={(enrollments ?? []).map((enrollment) => {
          const student = relFirst(enrollment.student);
          return {
            enrollment_id: enrollment.enrollment_id,
            enrolled_at: String(enrollment.enrolled_at),
            status: enrollment.status,
            student_number: student?.student_number ?? "",
            name: student?.name ?? "",
            email: student?.email ?? null,
            attended: attendedByStudentId.get(enrollment.student_id) ?? 0,
          };
        })}
        sessions={(sessions ?? [])
          .map((session, index) => ({
            session_id: session.session_id,
            session_date: getLocalDateISO(session.session_date),
            start_time: formatTimeAmPm(session.start_time),
            end_time: formatTimeAmPm(session.end_time),
            classLabel: `Class ${index + 1}`,
          }))}
        totalSessions={totalSessions}
      />
    </div>
  );
}
