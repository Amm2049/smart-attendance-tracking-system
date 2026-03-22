import { requireProfessor } from "@/lib/auth/require-professor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";

export default async function DashboardPage() {
  const { professor, userEmail } = await requireProfessor();

  if (!professor) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
        <Card>
          <CardHeader>
            <CardTitle>Access not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[15px] text-muted-foreground md:text-base">
            <p>
              Your login email <span className="font-mono">{userEmail}</span>{" "}
              is not found in <span className="font-mono">PROFESSOR</span>.
            </p>
            <p>
              Insert this professor into Supabase table{" "}
              <span className="font-mono">PROFESSOR</span> (seed step) then try
              again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-[15px] text-muted-foreground md:text-base">
            Welcome, {professor.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/courses" variant="outline">
            Manage Courses
          </LinkButton>
          <LinkButton href="/sections">Manage Sections</LinkButton>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
          </CardHeader>
          <CardContent className="text-[15px] text-muted-foreground md:text-base">
            Create and manage course catalog used by sections.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Scan flow</CardTitle>
          </CardHeader>
          <CardContent className="text-[15px] text-muted-foreground md:text-base">
            Sessions generate a QR that students use to check in with location
            validation.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
