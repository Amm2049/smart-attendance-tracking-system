-- Add checkin_ip column to ATTENDANCERECORD for IP-based rate limiting
-- Nullable so existing records are unaffected
ALTER TABLE "ATTENDANCERECORD"
  ADD COLUMN IF NOT EXISTS "checkin_ip" TEXT;
