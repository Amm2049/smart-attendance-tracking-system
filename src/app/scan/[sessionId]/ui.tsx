"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAttendance } from "./actions";

const schema = z.object({
  studentNumber: z.string().min(1),
  name: z.string().min(1),
});

function getCheckinKey(sessionId: string) {
  return `sats_checked_${sessionId}`;
}

function subscribeToCheckinStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getCheckinSnapshot(sessionId: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getCheckinKey(sessionId)) === "1";
}

async function getLocation() {
  return await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => reject(new Error("Location permission is required.")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

export function ScanClient({
  sessionId,
  token,
}: {
  sessionId: string;
  token: string;
}) {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "ready" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [form, setForm] = useState({ studentNumber: "", name: "" });
  const checkedInLocally = useSyncExternalStore(
    subscribeToCheckinStorage,
    () => getCheckinSnapshot(sessionId),
    () => false
  );
  const done = submitted || checkedInLocally;

  const tokenMissing = useMemo(() => !token || token.length < 10, [token]);

  const captureLocation = async () => {
    setLocationStatus("requesting");
    setLocationError(null);

    try {
      const loc = await getLocation();
      setLocation(loc);
      setLocationStatus("ready");
      toast.success("Current location captured.");
    } catch (e) {
      setLocation(null);
      setLocationStatus("error");
      setLocationError(
        e instanceof Error ? e.message : "Unable to get your current location."
      );
    }
  };

  if (done) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-5xl">🎉</p>
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-emerald-700 md:text-3xl">
            Check-in successful!
          </p>
          <p className="text-sm text-emerald-700/80 md:text-base">
            You are marked present. Nice work!
          </p>
          <p className="text-xs text-emerald-700/70 md:text-sm">
            You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitError(null);
        const parsed = schema.safeParse(form);
        if (!parsed.success) {
          setSubmitError("Please enter your Student ID and Name.");
          toast.error("Please enter Student ID and Name.");
          return;
        }
        if (tokenMissing) {
          setSubmitError("This QR code is invalid. Please scan a fresh one.");
          toast.error("Invalid QR token.");
          return;
        }
        if (!location) {
          setSubmitError("Use your current location before checking in.");
          toast.error("Use your current location before checking in.");
          return;
        }

        startTransition(async () => {
          try {
            setSubmitError(null);
            await submitAttendance({
              sessionId,
              token,
              studentNumber: parsed.data.studentNumber,
              name: parsed.data.name,
              location,
            });
            toast.success("Attendance recorded.");
            // Lock this browser from re-submitting for this session
            localStorage.setItem(getCheckinKey(sessionId), "1");
            setSubmitted(true);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed.";
            setSubmitError(message);
            toast.error(message);
          }
        });
      }}
    >
      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="text-4xl">😕</p>
          <p className="mt-2 text-xl font-semibold text-rose-700 md:text-2xl">
            Check-in was not successful
          </p>
          <p className="mt-2 text-sm text-rose-700 md:text-base">{submitError}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="studentNumber">Student ID</Label>
        <Input
          id="studentNumber"
          inputMode="text"
          autoComplete="off"
          value={form.studentNumber}
          onChange={(e) =>
            setForm((s) => ({ ...s, studentNumber: e.target.value }))
          }
          placeholder="20201234"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          placeholder="Your name"
          required
        />
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Label>Current location</Label>
          <p className="text-sm text-muted-foreground">
            Share your current location so we can verify you are in the classroom.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending || locationStatus === "requesting"}
          onClick={() => {
            void captureLocation();
          }}
        >
          {locationStatus === "requesting" ? "Requesting..." : "Use current location"}
        </Button>

        <div className="text-sm text-muted-foreground">
          {locationStatus === "idle" ? <span>Location not captured yet.</span> : null}
          {locationStatus === "ready" && location ? (
            <span>
              Location captured at {location.lat.toFixed(5)}, {location.lng.toFixed(5)}.
            </span>
          ) : null}
          {locationStatus === "error" ? (
            <span className="text-destructive">
              {locationError ?? "Turn on browser location access and try again."}
            </span>
          ) : null}
        </div>
      </div>

      <Button className="w-full h-11" type="submit" disabled={pending}>
        {pending ? "Checking in..." : "Check in"}
      </Button>
    </form>
  );
}
