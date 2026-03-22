import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./ui";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Professor Login</CardTitle>
          <CardDescription>
            Sign in with an approved professor account to manage courses and attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm />
          <p className="text-sm text-muted-foreground">
            Accounts are created manually in Supabase and must match a seeded{" "}
            <code className="font-mono">PROFESSOR</code> email.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
