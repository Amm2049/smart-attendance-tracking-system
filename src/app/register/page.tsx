import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RegisterPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Registration Disabled</CardTitle>
          <CardDescription>
            Only approved professors can access SATS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Create the auth user manually in Supabase, then add a matching row in{" "}
              <code className="font-mono">PROFESSOR</code>.
            </p>
            <p>Once that is done, the professor can sign in normally.</p>
          </div>
          <p className="text-sm">
            <Link className="underline underline-offset-4" href="/login">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
