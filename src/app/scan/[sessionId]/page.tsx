import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanClient } from "./ui";

export default async function ScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { sessionId } = await params;
  const { t } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Attendance Check-in</CardTitle>
          <CardDescription>
            Enter your details, then use your current location before checking in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScanClient sessionId={sessionId} token={t ?? ""} />
        </CardContent>
      </Card>
    </main>
  );
}
