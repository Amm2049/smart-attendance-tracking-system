import { requireProfessor } from "@/lib/auth/require-professor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoursesClient } from "./ui";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function CoursesPage() {
  const { professor, userEmail } = await requireProfessor();

  if (!professor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
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
  const { data: courses, error } = await admin
    .from("course")
    .select("*")
    .order("course_code", { ascending: true });
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Courses</h1>
        <p className="text-[15px] text-muted-foreground md:text-base">Manage the course catalog.</p>
      </div>
      <CoursesClient courses={courses ?? []} />
    </div>
  );
}
