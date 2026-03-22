"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { haversineDistanceMeters } from "@/lib/geo/haversine";
import {
  getLocalDateISO,
  getLocalTimeHHmm,
  parseLocalDateTime,
} from "@/lib/datetime/local";
import { verifySessionToken } from "@/lib/qr/token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { relFirst, type RelOne } from "@/lib/supabase/rel";

const inputSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  token: z.string().min(10),
  studentNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

type SectionLocationRow = {
  section_id: number;
  classroom_lat: number;
  classroom_lng: number;
  allowed_radius_m: number;
};

type SessionRow = {
  session_id: number;
  section_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  active_qr_nonce: string | null;
  section: RelOne<SectionLocationRow>;
};

type StudentLookupRow = {
  student_id: number;
  student_number: string;
  name: string;
};

type EnrollmentLookupRow = {
  enrollment_id: number;
};

export async function submitAttendance(input: unknown) {
  const parsed = inputSchema.parse(input);

  // --- Extract client IP for rate limiting ---
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const clientIp =
    forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : (headersList.get("x-real-ip") ?? "unknown");

  const sessionId = parsed.sessionId;
  const token = parsed.token;

  const verified = await verifySessionToken(token, sessionId);

  const admin = createSupabaseAdminClient();
  const { data: session, error: sessErr } = await admin
    .from("classsession")
    .select(
      "session_id, section_id, session_date, start_time, end_time, active_qr_nonce, section:section_id(section_id, classroom_lat, classroom_lng, allowed_radius_m)"
    )
    .eq("session_id", sessionId)
    .maybeSingle<SessionRow>();
  if (sessErr) throw new Error(sessErr.message);
  if (!session) throw new Error("Session expired");
  if (!session.active_qr_nonce || session.active_qr_nonce !== verified.nonce) {
    throw new Error("This QR code is no longer active. Please scan the latest QR.");
  }

  const dateISO = getLocalDateISO(session.session_date);
  const start = getLocalTimeHHmm(session.start_time);
  const end = getLocalTimeHHmm(session.end_time);

  const startsAt = parseLocalDateTime(dateISO, start);
  const endsAt = parseLocalDateTime(dateISO, end);
  const now = new Date();

  if (now < startsAt) {
    throw new Error(
      `Session has not started yet. Check-in opens at ${startsAt.toLocaleString()}.`
    );
  }

  if (now > endsAt || now > verified.expiresAt) {
    throw new Error(`Session ended at ${endsAt.toLocaleString()}.`);
  }

  const section = relFirst(session.section);
  if (!section) throw new Error("Section not found.");

  const distanceM = haversineDistanceMeters({
    lat1: section.classroom_lat,
    lng1: section.classroom_lng,
    lat2: parsed.location.lat,
    lng2: parsed.location.lng,
  });

  if (distanceM > section.allowed_radius_m) {
    throw new Error("You are outside the allowed area.");
  }

  const { data: existingStudent, error: findStudentErr } = await admin
    .from("student")
    .select("student_id, student_number, name")
    .eq("student_number", parsed.studentNumber)
    .maybeSingle<StudentLookupRow>();
  if (findStudentErr) throw new Error(findStudentErr.message);

  if (!existingStudent) {
    throw new Error("Student record not found. Please contact your professor.");
  }

  // Validate that the submitted name matches the enrolled student's name
  if (existingStudent.name.trim().toLowerCase() !== parsed.name.trim().toLowerCase()) {
    throw new Error("Name does not match your student record. Please check your name and try again.");
  }

  const { data: enrollment, error: enrollErr } = await admin
    .from("enrollment")
    .select("enrollment_id")
    .eq("section_id", section.section_id)
    .eq("student_id", existingStudent.student_id)
    .maybeSingle<EnrollmentLookupRow>();
  if (enrollErr) throw new Error(enrollErr.message);

  if (!enrollment) {
    throw new Error("You are not enrolled in this section.");
  }

  // --- IP-based rate limit: one check-in per device per 90 seconds per session ---
  if (clientIp !== "unknown") {
    const cutoff = new Date(Date.now() - 90 * 1000).toISOString();
    const { data: recentRecord, error: rateErr } = await admin
      .from("attendancerecord")
      .select("attendance_id")
      .eq("session_id", sessionId)
      .eq("checkin_ip", clientIp)
      .gte("scanned_at", cutoff)
      .maybeSingle();
    if (rateErr) throw new Error(rateErr.message);
    if (recentRecord) {
      throw new Error(
        "A check-in was just submitted from this device. Please wait before trying again."
      );
    }
  }

  const { error: attendanceErr } = await admin.from("attendancerecord").insert({
    session_id: sessionId,
    student_id: existingStudent.student_id,
    enrollment_id: enrollment.enrollment_id,
    scanned_at: new Date().toISOString(),
    location_verified: true,
    status: "present",
    checkin_token: token,
    checkin_ip: clientIp,
    token_issued_at: (verified.issuedAt ?? new Date()).toISOString(),
    token_expires_at: verified.expiresAt.toISOString(),
  });

  if (attendanceErr) {
    if (attendanceErr.code === "23505") throw new Error("Already checked in");
    throw new Error(attendanceErr.message);
  }

  return {
    ok: true as const,
    studentNumber: parsed.studentNumber,
    scannedAt: new Date().toISOString(),
  };
}
