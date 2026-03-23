"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createSession,
  deleteSession,
  enrollStudent,
  importStudents,
  removeEnrollment,
  removeAllEnrollments,
} from "./actions";
import { LinkButton } from "@/components/link-button";
import { getTodayLocalDateISO } from "@/lib/datetime/local";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getDefaultSessionTimes() {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    start_time: `${pad2(start.getHours())}:${pad2(start.getMinutes())}`,
    end_time: `${pad2(end.getHours())}:${pad2(end.getMinutes())}`,
  };
}

function getDefaultSessionForm() {
  const defaults = getDefaultSessionTimes();
  return {
    session_date: getTodayLocalDateISO(),
    start_time: defaults.start_time,
    end_time: defaults.end_time,
  };
}

const sessionSchema = z.object({
  session_date: z.string().min(10),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
});

const studentSchema = z.object({
  student_number: z.string().min(1),
  name: z.string().min(1),
  email: z.string().optional(),
});

export function SectionDetailClient({
  section,
  students,
  sessions,
  totalSessions,
}: {
  section: { section_id: number; allowed_radius_m: number; room: string | null };
  students: {
    enrollment_id: number;
    enrolled_at: string;
    status: string;
    student_number: string;
    name: string;
    email: string | null;
    attended: number;
  }[];
  totalSessions: number;
  sessions: {
    session_id: number;
    classLabel: string;
    session_date: string;
    start_time: string;
    end_time: string;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
  });
  const [studentForm, setStudentForm] = useState({
    student_number: "",
    name: "",
    email: "",
  });
  const [rosterText, setRosterText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [attendanceSort, setAttendanceSort] = useState<"asc" | "desc">("desc");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>Allowed radius: {section.allowed_radius_m}m</div>
          <div>Room: {section.room ?? "-"}</div>
          <div>Enrolled students: {students.length}</div>
        </CardContent>
      </Card>

      {/* FIX: Tabs moved out of CardHeader and into CardContent */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Section workspace</CardTitle>
            <Badge variant="secondary">{students.length} students</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="pt-4">
              <div className="flex justify-end">
                <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSessionForm(getDefaultSessionForm());
                      }}
                    >
                      Create session
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create session</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="session_date">Date</Label>
                        <Input
                          id="session_date"
                          type="date"
                          value={sessionForm.session_date}
                          onChange={(e) =>
                            setSessionForm((s) => ({ ...s, session_date: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="start_time">Start</Label>
                          <Input
                            id="start_time"
                            type="time"
                            value={sessionForm.start_time}
                            onChange={(e) =>
                              setSessionForm((s) => ({ ...s, start_time: e.target.value }))
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="end_time">End</Label>
                          <Input
                            id="end_time"
                            type="time"
                            value={sessionForm.end_time}
                            onChange={(e) =>
                              setSessionForm((s) => ({ ...s, end_time: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setSessionOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        disabled={pending}
                        type="button"
                        onClick={() => {
                          const parsed = sessionSchema.safeParse(sessionForm);
                          if (!parsed.success) {
                            toast.error(parsed.error.issues[0]?.message ?? "Invalid input.");
                            return;
                          }
                          startTransition(async () => {
                            try {
                              await createSession(section.section_id, parsed.data);
                              toast.success("Session created.");
                              setSessionOpen(false);
                              router.refresh();
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

              <div className="pt-4">
                <div className="rounded-md border max-h-[500px] overflow-y-auto relative hide-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[110px]">Class</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden sm:table-cell">Time</TableHead>
                        <TableHead className="w-[170px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.session_id}>
                          <TableCell className="font-medium">{session.classLabel}</TableCell>
                          <TableCell>
                            <div>{session.session_date}</div>
                            <div className="font-mono text-xs text-muted-foreground sm:hidden">
                              {session.start_time}-{session.end_time}
                            </div>
                          </TableCell>
                          <TableCell className="hidden font-mono sm:table-cell">
                            {session.start_time}-{session.end_time}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                              <LinkButton
                                href={`/sessions/${session.session_id}`}
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
                                  setDeleteTarget({
                                    id: session.session_id,
                                    label: session.classLabel,
                                  });
                                  setDeleteOpen(true);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sessions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-sm text-muted-foreground">
                            No sessions yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete session?</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete{" "}
                    <span className="font-semibold text-foreground">
                      {deleteTarget?.label ?? "this session"}
                    </span>{" "}
                    and all of its attendance records. This action cannot be undone.
                  </p>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteTarget(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      type="button"
                      disabled={pending || !deleteTarget}
                      onClick={() => {
                        if (!deleteTarget) return;
                        startTransition(async () => {
                          try {
                            await deleteSession(deleteTarget.id);
                            toast.success("Session deleted.");
                            setDeleteOpen(false);
                            setDeleteTarget(null);
                            router.refresh();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed.");
                          }
                        });
                      }}
                    >
                      {pending ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="students" className="pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Add student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add student manually</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="student_number">Student ID</Label>
                        <Input
                          id="student_number"
                          value={studentForm.student_number}
                          onChange={(e) =>
                            setStudentForm((s) => ({ ...s, student_number: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="student_name">Name</Label>
                        <Input
                          id="student_name"
                          value={studentForm.name}
                          onChange={(e) =>
                            setStudentForm((s) => ({ ...s, name: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="student_email">Email (optional)</Label>
                        <Input
                          id="student_email"
                          type="email"
                          value={studentForm.email}
                          onChange={(e) =>
                            setStudentForm((s) => ({ ...s, email: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setManualOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        disabled={pending}
                        type="button"
                        onClick={() => {
                          const parsed = studentSchema.safeParse(studentForm);
                          if (!parsed.success) {
                            toast.error(parsed.error.issues[0]?.message ?? "Invalid input.");
                            return;
                          }
                          startTransition(async () => {
                            try {
                              const result = await enrollStudent(section.section_id, parsed.data);
                              toast.success(
                                result.created
                                  ? "Student enrolled."
                                  : "Student was already enrolled."
                              );
                              setManualOpen(false);
                              setStudentForm({ student_number: "", name: "", email: "" });
                              router.refresh();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed.");
                            }
                          });
                        }}
                      >
                        {pending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {students.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !confirm(
                          `Remove all ${students.length} student(s) from this section?\n\nThis cannot be undone. Students with attendance records cannot be removed.`
                        )
                      )
                        return;
                      startTransition(async () => {
                        try {
                          const result = await removeAllEnrollments(section.section_id);
                          toast.success(`Removed ${result.removed} student(s) from this section.`);
                          router.refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed.");
                        }
                      });
                    }}
                  >
                    Remove all students
                  </Button>
                )}

                <Dialog open={importOpen} onOpenChange={setImportOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Import CSV</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import roster</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <p className="text-sm text-muted-foreground">
                        Upload a CSV file or paste rows below. Header rows are supported, and extra columns are ignored.
                      </p>
                      <div className="grid gap-2">
                        <Label htmlFor="roster_file">CSV file</Label>
                        <Input
                          id="roster_file"
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) {
                              setSelectedFileName("");
                              return;
                            }
                            setSelectedFileName(file.name);
                            void file.text().then(setRosterText).catch(() => {
                              toast.error("Could not read the selected CSV file.");
                            });
                          }}
                        />
                        {selectedFileName ? (
                          <p className="text-xs text-muted-foreground">
                            Loaded file: {selectedFileName}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="roster_text">CSV content</Label>
                        <p className="text-xs text-muted-foreground">
                          Example header: <span className="font-mono">student_number,name,email</span>
                        </p>
                      </div>
                      <Textarea
                        id="roster_text"
                        value={rosterText}
                        onChange={(e) => setRosterText(e.target.value)}
                        placeholder={
                          "student_number,name,email\n20201234,Jane Doe,jane@example.com\n20201235,John Smith,"
                        }
                        rows={8}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setImportOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        disabled={pending}
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              const result = await importStudents(section.section_id, {
                                roster: rosterText,
                              });
                              toast.success(
                                `Imported ${result.imported} row(s). ${result.createdCount} new enrollment(s), ${result.existingCount} already enrolled.`
                              );
                              setImportOpen(false);
                              setRosterText("");
                              setSelectedFileName("");
                              router.refresh();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed.");
                            }
                          });
                        }}
                      >
                        {pending ? "Importing..." : "Import"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="pt-4">
                <div className="rounded-md border max-h-[500px] overflow-y-auto relative hide-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.enrollment_id}>
                          <TableCell className="font-mono">{student.student_number}</TableCell>
                          <TableCell>
                            <div>{student.name}</div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              {student.email ?? "No email"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{student.email ?? "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">{student.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={pending}
                              onClick={() => {
                                if (!confirm("Remove this student from the section?")) return;
                                startTransition(async () => {
                                  try {
                                    await removeEnrollment(student.enrollment_id);
                                    toast.success("Student removed from section.");
                                    router.refresh();
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Failed.");
                                  }
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {students.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-sm text-muted-foreground">
                            No students enrolled yet. Add one manually or import a roster.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* ── Attendance Review Tab ── */}
            <TabsContent value="attendance" className="pt-4">
              {(() => {
                function getTier(pct: number) {
                  if (pct === 100) return { label: "Perfect", barColor: "bg-emerald-500", textColor: "text-emerald-700", borderColor: "border-emerald-200", bg: "bg-emerald-50" };
                  if (pct >= 75) return { label: "Good", barColor: "bg-emerald-400", textColor: "text-emerald-700", borderColor: "border-emerald-200", bg: "bg-emerald-50" };
                  if (pct >= 50) return { label: "Warning", barColor: "bg-amber-400", textColor: "text-amber-700", borderColor: "border-amber-200", bg: "bg-amber-50" };
                  return { label: "Poor", barColor: "bg-rose-500", textColor: "text-rose-700", borderColor: "border-rose-200", bg: "bg-rose-50" };
                }

                const withPct = students.map((s) => ({
                  ...s,
                  pct: totalSessions > 0 ? Math.round((s.attended / totalSessions) * 100) : 0,
                }));

                const sorted = [...withPct].sort((a, b) =>
                  attendanceSort === "desc" ? b.pct - a.pct : a.pct - b.pct
                );

                const warning = sorted.filter((s) => s.pct >= 50 && s.pct < 75).length;

                function exportCsv() {
                  const header = ["student_number", "name", "attended", "total_sessions", "percentage", "status"];
                  const rows = sorted.map((s) => [
                    s.student_number, s.name, String(s.attended),
                    String(totalSessions), `${s.pct}%`, getTier(s.pct).label,
                  ]);
                  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
                  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                  const a = document.createElement("a");
                  a.href = url; a.download = `attendance-section-${section.section_id}.csv`; a.click();
                  URL.revokeObjectURL(url);
                }

                if (totalSessions === 0) {
                  return (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No sessions yet. Create sessions to start tracking attendance.
                    </div>
                  );
                }
                if (students.length === 0) {
                  return (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No students enrolled yet.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {students.length} student(s) · {totalSessions} session(s)
                        {warning > 0 && <span className="ml-2 text-amber-600 font-medium">· ⚠️ {warning} near threshold</span>}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => setAttendanceSort((s) => (s === "desc" ? "asc" : "desc"))}
                        >
                          {attendanceSort === "desc" ? "↓ Highest first" : "↑ Lowest first"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={exportCsv}>
                          Export CSV
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border max-h-[500px] overflow-y-auto relative hide-scrollbar">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead className="w-[100px] text-center">Attended</TableHead>
                            <TableHead className="w-[140px]">Score</TableHead>
                            <TableHead className="w-[100px] text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sorted.map((s) => {
                            const tier = getTier(s.pct);
                            return (
                              <TableRow key={s.enrollment_id}>
                                <TableCell>
                                  <div className="font-medium">{s.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{s.student_number}</div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {s.attended} / {totalSessions}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                      <div className={`h-full ${tier.barColor}`} style={{ width: `${s.pct}%` }} />
                                    </div>
                                    <span className="text-sm font-medium w-9">{s.pct}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className={`${tier.textColor} ${tier.borderColor} ${tier.bg}`}>
                                    {tier.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
