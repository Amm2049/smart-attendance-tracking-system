# SATS — Smart Attendance Tracking System (V1)

Mobile-first attendance system:
- **Professor** logs in (Supabase Auth) and manages **Courses → Sections → Sessions**
- **Student** (no login) scans a **QR code**, shares location, and checks in

## Tech
- Next.js (App Router, Server Actions, TypeScript)
- Supabase (Auth + Postgres)
- Prisma
- Tailwind CSS + shadcn/ui
- QR generator + scanner
- Browser Geolocation API

## Routes
- **Public**: `/scan/[sessionId]`
- **Protected (Professor)**: `/dashboard`, `/courses`, `/sections`, `/sections/[id]`, `/sessions/[id]`

## Supabase setup (required)

### 1) Create project
Create a Supabase project (Postgres + Auth).

### 2) Auth settings
- Enable **Email/Password** provider.
- Recommended for V1: **disable public signups** (so only your seeded professors can use it).

### 3) Database schema (match ERD)
Create tables exactly as in the ERD:
`PROFESSOR`, `COURSE`, `SECTION`, `CLASSSESSION`, `STUDENT`, `ENROLLMENT`, `ATTENDANCERECORD`

Add constraints from the ERD:
- `COURSE.course_code` UNIQUE
- `PROFESSOR.email` UNIQUE
- `STUDENT.email` UNIQUE (nullable)
- `STUDENT.student_number` UNIQUE
- `ENROLLMENT` UNIQUE(`section_id`, `student_id`)
- `ATTENDANCERECORD` UNIQUE(`session_id`, `student_id`)

### 4) Seed professors (required)
This app links the logged-in user to `PROFESSOR` **by email**.

Before logging in, insert rows into `PROFESSOR` and ensure:
- `PROFESSOR.email` matches the Supabase Auth email exactly

### 5) RLS (Row Level Security)
V1 recommended approach (simple + reliable):
- Keep RLS strict or off for these tables and use **server-only** access for professor actions.
- Never expose the service role key to the browser.

If you want stricter security later, we can enable RLS and write policies that restrict access via the logged-in email → professor → section ownership.

## Environment variables
Create `.env.local` in this folder:
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...` (server-only)
- `DATABASE_URL=...` (Supabase connection string for Prisma)
- `QR_TOKEN_SECRET=...` (server-only)

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
