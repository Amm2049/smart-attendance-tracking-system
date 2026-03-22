import { NextResponse } from "next/server";
import { requireProfessor } from "@/lib/auth/require-professor";
import {
  getLocalDateISO,
  getLocalTimeHHmm,
  parseLocalDateTime,
} from "@/lib/datetime/local";
import { signSessionToken } from "@/lib/qr/token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { relFirst, type RelOne } from "@/lib/supabase/rel";

type SectionRow = {
  section_id: number;
  professor_id: number;
};

type SessionRow = {
  session_id: number;
  session_date: string;
  end_time: string;
  active_qr_nonce: string | null;
  section: RelOne<SectionRow>;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { professor } = await requireProfessor();
  if (!professor) return new NextResponse("Professor not seeded.", { status: 403 });

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return new NextResponse("Invalid session id.", { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: session, error } = await admin
    .from("classsession")
    .select("session_id, session_date, end_time, section:section_id(section_id, professor_id)")
    .eq("session_id", sessionId)
    .maybeSingle<SessionRow>();
  if (error) return new NextResponse(error.message, { status: 500 });

  const section = session ? relFirst(session.section) : null;
  const profId = section?.professor_id;

  if (!session || profId !== professor.professor_id) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const dateISO = getLocalDateISO(session.session_date);
  const end = getLocalTimeHHmm(session.end_time);
  const expiresAt = parseLocalDateTime(dateISO, end);
  if (new Date() > expiresAt) {
    return new NextResponse("Session expired. Update the session time or create a new session.", {
      status: 400,
    });
  }

  const nonce = crypto.randomUUID();
  const { error: updateErr } = await admin
    .from("classsession")
    .update({ active_qr_nonce: nonce })
    .eq("session_id", sessionId);
  if (updateErr) return new NextResponse(updateErr.message, { status: 500 });

  const token = await signSessionToken({ sessionId, expiresAt, nonce });

  const base = new URL(request.url);
  base.pathname = `/scan/${sessionId}`;
  base.search = "";
  base.searchParams.set("t", token);

  return NextResponse.json({ url: base.toString() });
}
