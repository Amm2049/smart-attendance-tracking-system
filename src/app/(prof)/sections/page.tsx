import { requireProfessor } from "@/lib/auth/require-professor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionsClient } from "./ui";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { relFirst, type RelOne } from "@/lib/supabase/rel";

export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course } = await searchParams;
  const { professor, userEmail } = await requireProfessor();

  if (!professor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your login email <span className="font-mono">{userEmail}</span> is not
          in <span className="font-mono">PROFESSOR</span>. Seed professors in
          Supabase first.
        </CardContent>
      </Card>
    );
  }

  const admin = createSupabaseAdminClient();
  const [
    { data: courses, error: coursesErr },
    { data: sections, error: sectionsErr },
  ] = await Promise.all([
    admin.from("course").select("*").order("course_code", { ascending: true }),
    admin
      .from("section")
      .select(
        "section_id, term, section, schedule, room, allowed_radius_m, course:course_id(course_id, course_code, title)",
      )
      .eq("professor_id", professor.professor_id)
      .order("term", { ascending: false })
      .order("section_id", { ascending: false }),
  ]);

  if (coursesErr) throw new Error(coursesErr.message);
  if (sectionsErr) throw new Error(sectionsErr.message);

  type CourseRow = { course_id: number; course_code: string; title: string };
  type SectionRow = {
    section_id: number;
    term: string;
    section: string;
    schedule: string;
    room: string | null;
    allowed_radius_m: number;
    course: RelOne<CourseRow>;
  };

  const normalizedSections = ((sections ?? []) as unknown as SectionRow[]).map(
    (s) => ({
      section_id: s.section_id,
      term: s.term,
      section: s.section,
      schedule: s.schedule,
      room: s.room,
      allowed_radius_m: s.allowed_radius_m,
      course: relFirst(s.course) as CourseRow,
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Sections
          </h1>
          <p className="text-[15px] text-muted-foreground md:text-base">
            Create sections (requires classroom location).
          </p>
        </div>

      </div>

      <SectionsClient
        courses={(courses ?? []) as CourseRow[]}
        sections={normalizedSections}
        defaultCourseFilter={course ?? "all"}
      />
    </div>
  );
}
