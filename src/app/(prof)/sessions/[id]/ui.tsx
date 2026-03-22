"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SessionQr({
  sessionId,
  expiresAt,
}: {
  sessionId: number;
  expiresAt: string;
}) {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function generateQr() {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/qr`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { url: string };
      setUrl(data.url);
      toast.success("QR generated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate QR.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>QR Code</CardTitle>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => void generateQr()} disabled={loading}>
            {loading ? "Generating..." : url ? "Regenerate QR" : "Generate QR"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard
                .writeText(url)
                .then(() => toast.success("Link copied."))
                .catch(() => toast.error("Copy failed."));
            }}
            disabled={!url}
          >
            Copy link
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {url ? (
            <>
              Expires at: <span className="font-mono">{new Date(expiresAt).toLocaleString()}</span>
            </>
          ) : (
            "Generate a QR only when you're ready for students to scan."
          )}
        </p>
        <div className="flex justify-center rounded-xl border bg-card p-6">
          {url ? (
            <QRCodeCanvas value={url} size={240} />
          ) : (
            <div className="text-sm text-muted-foreground">
              QR has not been generated for this view yet.
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Students scan this QR to open the check-in page.
        </p>
      </CardContent>
    </Card>
  );
}
