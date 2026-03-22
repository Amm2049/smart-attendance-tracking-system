import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "@/lib/env";

type SessionTokenPayload = {
  sid: number;
  nonce: string;
};

function getSecret() {
  const { QR_TOKEN_SECRET: secret } = getServerEnv();
  if (!secret) throw new Error("QR_TOKEN_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(params: {
  sessionId: number;
  expiresAt: Date;
  nonce: string;
}) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = Math.floor(params.expiresAt.getTime() / 1000);

  return await new SignJWT({
    sid: params.sessionId,
    nonce: params.nonce,
  } satisfies SessionTokenPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifySessionToken(token: string, expectedSessionId: number) {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });

  const sid = Number(payload.sid);
  if (!Number.isFinite(sid) || sid !== expectedSessionId) {
    throw new Error("Invalid token.");
  }

  const expSeconds = payload.exp;
  if (typeof expSeconds !== "number") throw new Error("Invalid token.");

  return {
    sessionId: sid,
    nonce: typeof payload.nonce === "string" ? payload.nonce : "",
    expiresAt: new Date(expSeconds * 1000),
    issuedAt: typeof payload.iat === "number" ? new Date(payload.iat * 1000) : null,
  };
}
