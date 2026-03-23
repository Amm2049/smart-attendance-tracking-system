"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QR_TTL_MINUTES } from "@/lib/qr/constants";

export function SessionQr({ sessionId }: { sessionId: number }) {
  const [url, setUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const remainingMs = useMemo(() => {
    if (!expiresAt) return null;
    return new Date(expiresAt).getTime() - now;
  }, [expiresAt, now]);

  const countdownLabel = useMemo(() => {
    if (remainingMs === null) return null;
    if (remainingMs <= 0) return "Expired";
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingMs]);

  async function generateQr() {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/qr`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { url: string; expiresAt: string };
      setUrl(data.url);
      setExpiresAt(data.expiresAt);
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
          {url && expiresAt ? (
            <>
              Expires at:{" "}
              <span className="font-mono">{new Date(expiresAt).toLocaleString()}</span>
              {countdownLabel ? (
                <>
                  {" "}
                  • Expires in{" "}
                  <span className="font-mono">{countdownLabel}</span>
                </>
              ) : null}
            </>
          ) : (
            `Generate a QR only when you're ready. Each QR expires after ${QR_TTL_MINUTES} minutes.`
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
