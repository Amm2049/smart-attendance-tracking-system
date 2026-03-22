"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSection, deleteSection } from "./actions";
import { LinkButton } from "@/components/link-button";

type Course = { course_id: number; course_code: string; title: string };
type Section = {
  section_id: number;
  term: string;
  section: string;
  schedule: string;
  room: string | null;
  allowed_radius_m: number;
  course: Course;
};

const schema = z.object({
  course_id: z.coerce.number().int().positive(),
  term: z.string().min(1),
  section: z.string().min(1),
  schedule: z.string().min(1),
  room: z.string().optional(),
  allowed_radius_m: z.coerce.number().int().positive().default(100),
});

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
      (err) => reject(new Error(err.message || "Location permission denied.")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

export function SectionsClient({
  courses,
  sections,
  defaultCourseFilter = "all",
}: {
  courses: Course[];
  sections: Section[];
  defaultCourseFilter?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState(defaultCourseFilter);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "ready" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [form, setForm] = useState({
    course_id: courses[0]?.course_id?.toString() ?? "",
    term: "",
    section: "",
    schedule: "",
    room: "",
    allowed_radius_m: "100",
  });

  const canCreate = useMemo(() => courses.length > 0, [courses.length]);
  const filteredSections = useMemo(() => {
    return sections.filter((section) => {
      const matchesCourse =
        courseFilter === "all" || section.course.course_id.toString() === courseFilter;

      return matchesCourse;
    });
  }, [courseFilter, sections]);

  const resetLocationState = () => {
    setLocation(null);
    setLocationStatus("idle");
    setLocationError(null);
  };

  const captureLocation = () => {
    setLocationStatus("requesting");
    setLocationError(null);

    startTransition(async () => {
      try {
        const loc = await getLocation();
        setLocation(loc);
        setLocationStatus("ready");
        toast.success("Classroom location captured.");
      } catch (e) {
        setLocation(null);
        setLocationStatus("error");
        setLocationError(
          e instanceof Error ? e.message : "Unable to get your current location."
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>All Sections</CardTitle>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter sections by course"
            className="h-8 rounded-md border bg-background px-3 text-sm"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={course.course_id} value={course.course_id}>
                {course.course_code}
              </option>
            ))}
          </select>
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                resetLocationState();
                setForm((current) => ({
                  ...current,
                  course_id:
                    current.course_id || (courses[0]?.course_id?.toString() ?? ""),
                }));
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canCreate}>
                Create section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create section</DialogTitle>
              </DialogHeader>

              {!canCreate ? (
                <p className="text-sm text-muted-foreground">
                  Create a course first before adding sections.
                </p>
              ) : (
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="course_id">Course</Label>
                    <select
                      id="course_id"
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      value={form.course_id}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, course_id: e.target.value }))
                      }
                    >
                      {courses.map((c) => (
                        <option key={c.course_id} value={c.course_id}>
                          {c.course_code} - {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="term">Term</Label>
                    <Input
                      id="term"
                      value={form.term}
                      onChange={(e) => setForm((s) => ({ ...s, term: e.target.value }))}
                      placeholder="2026 Spring"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      value={form.section}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, section: e.target.value }))
                      }
                      placeholder="A"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="schedule">Recurring schedule</Label>
                    <Input
                      id="schedule"
                      value={form.schedule}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, schedule: e.target.value }))
                      }
                      placeholder="Mon/Wed 10:00-11:30"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="room">Room (optional)</Label>
                    <Input
                      id="room"
                      value={form.room}
                      onChange={(e) => setForm((s) => ({ ...s, room: e.target.value }))}
                      placeholder="Room 12"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="allowed_radius_m">Allowed radius (meters)</Label>
                    <Input
                      id="allowed_radius_m"
                      inputMode="numeric"
                      value={form.allowed_radius_m}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, allowed_radius_m: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-2 rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <Label>Classroom location</Label>
                        <p className="text-sm text-muted-foreground">
                          Use your current location to set the classroom geofence for this section.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending || locationStatus === "requesting"}
                        onClick={captureLocation}
                      >
                        {locationStatus === "requesting" ? "Requesting..." : "Use current location"}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {locationStatus === "ready" && location ? (
                        <span>
                          Location captured at {location.lat.toFixed(5)}, {location.lng.toFixed(5)}.
                        </span>
                      ) : null}
                      {locationStatus === "idle" ? (
                        <span>Location not captured yet.</span>
                      ) : null}
                      {locationStatus === "error" ? (
                        <span className="text-destructive">
                          {locationError ?? "Turn on browser location access and try again."}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    resetLocationState();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={pending || !canCreate}
                  onClick={() => {
                    const parsed = schema.safeParse(form);
                    if (!parsed.success) {
                      toast.error(parsed.error.issues[0]?.message ?? "Invalid input.");
                      return;
                    }
                    if (!location) {
                      toast.error("Capture classroom location before creating the section.");
                      return;
                    }
                    startTransition(async () => {
                      try {
                        await createSection({
                          ...parsed.data,
                          classroom_lat: location.lat,
                          classroom_lng: location.lng,
                        });
                        toast.success("Section created.");
                        setCreateOpen(false);
                        resetLocationState();
                        window.location.reload();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed.");
                      }
                    });
                  }}
                >
                  {pending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="hidden sm:table-cell">Schedule</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSections.map((section) => (
              <TableRow key={section.section_id}>
                <TableCell className="font-mono">{section.course.course_code}</TableCell>
                <TableCell>{section.term}</TableCell>
                <TableCell>{section.section}</TableCell>
                <TableCell className="hidden sm:table-cell">{section.schedule}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                    <LinkButton
                      href={`/sections/${section.section_id}`}
                      size="sm"
                      variant="outline"
                      className="inline-flex"
                    >
                      Open
                    </LinkButton>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("Delete this section?")) return;
                        startTransition(async () => {
                          try {
                            await deleteSection(section.section_id);
                            toast.success("Section deleted.");
                            router.refresh();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed.");
                          }
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSections.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No sections match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
