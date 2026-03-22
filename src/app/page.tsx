import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { AppLogo } from "@/components/app-logo";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <AppLogo />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Smart Attendance Tracking System. Professors manage courses, sections, and sessions. Students check in via QR code.
          </p>
          <div className="flex gap-2">
            <LinkButton href="/login">Professor Login</LinkButton>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
