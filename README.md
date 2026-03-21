# SATS - Smart Attendance Tracking System

SATS is a mobile-first classroom attendance system.

- Professors sign in with Supabase Auth and manage courses, sections, students, and sessions.
- Students do not sign in. They scan a QR code, share location, and submit attendance for a class session.

For the fuller project specification, see [SPECS.md](C:\Users\MSI\OneDrive\Desktop\SAD_project\sats\SPECS.md).

## Current Stack
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth + Postgres
- Prisma
- shadcn/base-ui style components
- QR token and scan flow
- Browser Geolocation API

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

## Current Features

### Professor
- Sign in with Supabase Auth
- Access protected dashboard
- Create, edit, and delete courses
- Create and delete sections
- Manage section detail workspace
- Create and delete class sessions
- Enroll students manually
- Import students from roster data
- View attendance records for a session
- Generate and display session QR code

### Student
- Open attendance page from QR/session link
- Enter student details
- Share current location
- Submit attendance check-in

## Auth and Access
- Professor routes are protected by middleware.
- A signed-in user must have a matching row in the `PROFESSOR` table by email.
- Registration is intentionally disabled in the app UI.
- Student attendance does not require login.
- Privileged professor operations run server-side and must keep the Supabase service role key private.

## Database Model
The current Prisma schema includes:
- `PROFESSOR`
- `COURSE`
- `SECTION`
- `STUDENT`
- `ENROLLMENT`
- `CLASSSESSION`
- `ATTENDANCERECORD`

Important constraints:
- Unique professor email
- Unique course code
- Unique student number
- Unique optional student email
- Unique enrollment per section and student
- Unique attendance record per session and student

## Environment Variables
Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
QR_TOKEN_SECRET=...
```

## Supabase Setup
1. Create a Supabase project with Auth and Postgres.
2. Enable Email/Password sign-in.
3. Create the database tables used by the Prisma schema.
4. Seed professor rows so the professor email matches the Supabase Auth email exactly.
5. Keep service-role access server-only.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes
- The app currently uses a blue-slate UI theme with a darker navy primary.
- Tables use transparent rows with hover state retained.
- Active navigation matches the main button primary color.
- A reusable SATS logo component is used in the landing page and professor header.
- In this local environment, `npm` is currently misconfigured, so lint verification could not be completed during inspection.
# smart_attendance_tracking_system
# smart_attendance_tracking_system
# smart_attendance_tracking_system
# sats
# sats
