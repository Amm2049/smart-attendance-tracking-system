"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCourse, deleteCourse, updateCourse } from "./actions";
import { LinkButton } from "@/components/link-button";

type Course = {
  course_id: number;
  course_code: string;
  title: string;
};

const schema = z.object({
  course_code: z.string().min(2).max(50),
  title: z.string().min(2).max(200),
});

const emptyForm = { course_code: "", title: "" };

export function CoursesClient({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpenId, setEditOpenId] = useState<number | null>(null);

  // Separate form state for Create and Edit dialogs
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>All Courses</CardTitle>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) setCreateForm(emptyForm);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">Create course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create course</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="course_code">Course code</Label>
                <Input
                  id="course_code"
                  value={createForm.course_code}
                  onChange={(e) =>
                    setCreateForm((s) => ({ ...s, course_code: e.target.value }))
                  }
                  placeholder="CS101"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Intro to CS"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                disabled={pending}
                onClick={() => {
                  const parsed = schema.safeParse(createForm);
                  if (!parsed.success) {
                    toast.error(parsed.error.issues[0]?.message ?? "Invalid input.");
                    return;
                  }
                  startTransition(async () => {
                    try {
                      await createCourse(parsed.data);
                      toast.success("Course created.");
                      setCreateForm(emptyForm);
                      setCreateOpen(false);
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[160px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.course_id}>
                <TableCell className="font-mono">{c.course_code}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                    <LinkButton
                      href={`/sections?course=${c.course_id}`}
                      size="sm"
                      variant="outline"
                      className="inline-flex"
                    >
                      Sections
                    </LinkButton>
                    <Dialog
                      open={editOpenId === c.course_id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditOpenId(c.course_id);
                          setEditForm({ course_code: c.course_code, title: c.title });
                        } else {
                          setEditOpenId(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditOpenId(c.course_id);
                            setEditForm({ course_code: c.course_code, title: c.title });
                          }}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit course</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="edit_course_code">Course code</Label>
                            <Input
                              id="edit_course_code"
                              value={editForm.course_code}
                              onChange={(e) =>
                                setEditForm((s) => ({
                                  ...s,
                                  course_code: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit_title">Title</Label>
                            <Input
                              id="edit_title"
                              value={editForm.title}
                              onChange={(e) =>
                                setEditForm((s) => ({ ...s, title: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          {/* FIX: onClick handler added — was missing */}
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => setEditOpenId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={pending}
                            onClick={() => {
                              const parsed = schema.safeParse(editForm);
                              if (!parsed.success) {
                                toast.error(
                                  parsed.error.issues[0]?.message ?? "Invalid input."
                                );
                                return;
                              }
                              startTransition(async () => {
                                try {
                                  await updateCourse(c.course_id, parsed.data);
                                  toast.success("Course updated.");
                                  setEditOpenId(null);
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

                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`Delete ${c.course_code}?`)) return;
                        startTransition(async () => {
                          try {
                            await deleteCourse(c.course_id);
                            toast.success("Course deleted.");
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
            {courses.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  No courses yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
