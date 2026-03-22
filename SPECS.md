# SATS Specifications

## Project
SATS is a mobile-first Smart Attendance Tracking System for classroom attendance.

There are two primary user flows:
- Professors sign in and manage courses, sections, students, and class sessions.
- Students do not sign in. They scan a QR code, share location, and submit attendance for a session.

## Current Tech Stack
- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/base-ui style components
- Supabase Auth and Postgres
- Prisma 7
- QR token generation and QR scanning support
- Browser Geolocation API

## Functional Scope

### Professor Features
- Login via Supabase Auth
- Protected dashboard
- Course management
  - Create course
  - Update course
  - Delete course
- Section management
  - Create section
  - Delete section
- Section detail workspace
  - View section settings
  - Create sessions
  - Delete sessions
  - Enroll students manually
  - Import students
  - Remove enrollments
- Session detail view
  - Display session information
  - Display QR code for attendance
  - View attendance table

### Student Features
- Open public scan page for a session
- Receive or use a session token
- Enter student details
- Share current location
- Submit attendance check-in

### Anti-Spoofing Attendance Protections
- **IP-based rate limit (server-side)**: After a successful check-in, the submitting device's IP address is stored in `AttendanceRecord.checkin_ip`. Any subsequent check-in attempt from the same IP within **90 seconds** for the same session is rejected server-side with a clear error message. This prevents a student from immediately checking in for an absent friend using the same device.
- **localStorage device flag (client-side)**: After a successful check-in, the browser writes a session-specific flag (`sats_checked_<sessionId>`) to `localStorage`. On the next page load from the same browser — including new tabs — the form is skipped and the success screen is shown immediately. Prevents re-use of the scan URL in the same browser.
- **Combined coverage**: Together, the two layers block re-submission from the same browser, new tabs, and incognito windows on the same phone (same IP). Only bypassed if the attacker waits 90+ seconds AND switches to a different physical device.

## Current Routes

### Public
- `/`
- `/login`
- `/register`
- `/scan/[sessionId]`
- `/api/sessions/[id]/qr`
- `/logout`

### Protected Professor Routes
- `/dashboard`
- `/courses`
- `/sections`
- `/sections/[id]`
- `/sessions/[id]`

## Authentication and Access Rules
- Professor pages are protected by middleware.
- Professor identity is resolved from the signed-in Supabase user email.
- A matching professor row must exist in the `PROFESSOR` table.
- Student attendance flow does not require student authentication.
- Server-side privileged operations use the Supabase service role and must never expose the service key to the browser.

## Data Model
The current Prisma schema defines these core entities:
- `Professor`
- `Course`
- `Section`
- `Student`
- `Enrollment`
- `ClassSession`
- `AttendanceRecord`

Important integrity rules already modeled:
- Unique professor email
- Unique course code
- Unique student number
- Unique optional student email
- Unique enrollment per section and student
- Unique attendance record per session and student

`AttendanceRecord` stores:
- `checkin_token` — the JWT used for the check-in
- `checkin_ip` — the submitting device IP address (used for rate limiting; nullable for legacy records)
- `token_issued_at` / `token_expires_at` — token validity window
- `location_verified` — whether the student passed the geofence check

## Environment Requirements
The app expects these environment variables. **All are required** — missing values cause a startup-time validation error:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `QR_TOKEN_SECRET`

## UI and Branding
- Current visual direction is a blue-slate interface with a darker navy primary color.
- Tables use transparent rows with hover state retained.
- Active professor navigation uses the same primary color system as the main buttons.
- The app includes a reusable SATS logo component with icon plus text wordmark.

## Prisma Configuration
- Prisma 7 is used. The datasource URL is configured in `prisma.config.ts` via `datasource.url`, **not** in `schema.prisma` (this is the correct pattern for Prisma 7 — adding `url` to the schema is a validation error).
- The generated Prisma client is output to `src/generated/prisma`.

## Current Implementation Notes
- Registration is intentionally disabled in-app. Approved professors must be created manually in Supabase Auth and linked by email in the `PROFESSOR` table.
- The app includes a sample roster CSV file for student import workflows.
- The `checkin_ip` column was added to `ATTENDANCERECORD` via a Supabase SQL migration: `ALTER TABLE "ATTENDANCERECORD" ADD COLUMN IF NOT EXISTS "checkin_ip" TEXT`.

## Spec Status
This file reflects the current implemented project scope as inspected and updated on 2026-03-21.
