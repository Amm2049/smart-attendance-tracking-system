import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfessor } from "@/lib/auth/require-professor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SessionQr } from "./ui";
import {
  getLocalDateISO,
  getLocalTimeHHmm,
  parseLocalDateTime,
} from "@/lib/datetime/local";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { relFirst, type RelOne } from "@/lib/supabase/rel";

type CourseRow = {
  course_code: string;
};

type SectionRow = {
  section_id: number;
  professor_id: number;
  course: RelOne<CourseRow>;
};

type SessionRow = {
  session_id: number;
  section_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  section: RelOne<SectionRow>;
};

type AttendanceStudentRow = {
  student_number: string;
  name: string;
};

type AttendanceRow = {
  attendance_id: number;
  scanned_at: string;
  student: RelOne<AttendanceStudentRow>;
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { professor } = await requireProfessor();
  if (!professor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Professor record not found. Seed <span className="font-mono">PROFESSOR</span> first.
        </CardContent>
      </Card>
    );
  }

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) notFound();

  const admin = createSupabaseAdminClient();
  const { data: session, error: sessErr } = await admin
    .from("classsession")
    .select(
      "session_id, section_id, session_date, start_time, end_time, section:section_id(section_id, professor_id, course:course_id(course_code))"
    )
    .eq("session_id", sessionId)
    .maybeSingle<SessionRow>();
  if (sessErr) throw new Error(sessErr.message);

  if (!session) notFound();
  const section = relFirst(session.section);
  if (!section || section.professor_id !== professor.professor_id) notFound();

  const dateISO = getLocalDateISO(session.session_date);
  const start = getLocalTimeHHmm(session.start_time);
  const end = getLocalTimeHHmm(session.end_time);

  const expiresAt = parseLocalDateTime(dateISO, end);
  const startsAt = parseLocalDateTime(dateISO, start);
  const now = new Date();
  const status =
    now < startsAt ? "Scheduled" : now <= expiresAt ? "Active" : "Ended";

  const { data: attendance, error: attErr } = await admin
    .from("attendancerecord")
    .select("attendance_id, scanned_at, student:student_id(student_number, name)")
    .eq("session_id", sessionId)
    .order("scanned_at", { ascending: true })
    .returns<AttendanceRow[]>();
  if (attErr) throw new Error(attErr.message);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {relFirst(section.course)?.course_code ?? "Course"} - Session
          </h1>
          <p className="text-[15px] text-muted-foreground md:text-base">
            {dateISO} {start}-{end} | {status}
          </p>
        </div>
        <Link
          className="text-[15px] underline underline-offset-4 md:text-base"
          href={`/sections/${section.section_id}`}
        >
          Back to sessions
        </Link>
      </div>

      <SessionQr sessionId={sessionId} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Attendance</CardTitle>
          <Badge variant="secondary">Total: {(attendance ?? []).length}</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell w-[180px]">Scanned at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(attendance ?? []).map((record) => {
                const student = relFirst(record.student);

                return (
                  <TableRow key={record.attendance_id}>
                    <TableCell className="font-mono">{student?.student_number}</TableCell>
                    <TableCell>{student?.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(record.scanned_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(attendance ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    No attendance yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
