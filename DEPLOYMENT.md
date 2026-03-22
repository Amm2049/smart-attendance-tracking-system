# SATS Deployment

This project is best deployed with:

- Vercel for the Next.js app
- Supabase for Auth and Postgres

## Before Deploying

1. Make sure your Supabase project already contains the tables used by SATS.
2. Make sure Email/Password sign-in is enabled in Supabase Auth.
3. Create at least one professor auth user in Supabase Auth.
4. Insert a matching row into `PROFESSOR` with the same email address.

## Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
QR_TOKEN_SECRET=
```

Notes:

- `NEXT_PUBLIC_*` values are safe for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
- `QR_TOKEN_SECRET` should be a long random secret.

## Deploy on Vercel

1. Push the project to GitHub.
2. In Vercel, click `Add New Project`.
3. Import the GitHub repository.
4. If Vercel imports the repository root instead of this app folder, set the Root Directory to `sats`.
5. Add the environment variables above.
6. Deploy.

## After Deploying

1. Open the production URL.
2. Test professor login.
3. Test section creation.
4. Test session creation and QR generation.
5. Test student check-in on a real phone over HTTPS.

## Production Checklist

- HTTPS is enabled
- Supabase Auth user exists
- Matching `PROFESSOR` row exists
- Environment variables are set in Vercel
- Geolocation works on mobile
