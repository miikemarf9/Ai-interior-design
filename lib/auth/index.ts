import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { getCatalogDb } from "@/lib/catalog/neon";

export const AUTH_COOKIE = "roomfound_session";
const SESSION_DAYS = 30;

export type SessionAccount = {
  id: string;
  email: string;
  displayName: string | null;
  emailVerifiedAt: string | null;
  ownerKey: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function canonicalOwnerKey(accountId: string) {
  return `account_${accountId.replaceAll("-", "")}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [kind, salt, expectedHex] = stored.split("$");
  if (kind !== "scrypt" || !salt || !expectedHex) return false;

  try {
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const sql = getCatalogDb();

  await sql.query(
    `insert into public.customer_auth_sessions (
      account_id, token_hash, expires_at
    ) values ($1::uuid,$2,$3::timestamptz)`,
    [accountId, tokenHash, expiresAt.toISOString()],
  );

  return { token, expiresAt };
}

export function applySessionCookie(
  response: Response & { cookies: { set: (...args: any[]) => void } },
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(
  response: Response & { cookies: { set: (...args: any[]) => void } },
) {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentAccount(): Promise<SessionAccount | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      a.id::text as id,
      a.email,
      a.display_name,
      a.email_verified_at::text,
      s.id::text as session_id
    from public.customer_auth_sessions s
    join public.customer_accounts a on a.id = s.account_id
    where s.token_hash=$1
      and s.revoked_at is null
      and s.expires_at > now()
      and a.status='active'
    limit 1`,
    [hashToken(token)],
  ) as Array<{
    id: string;
    email: string;
    display_name: string | null;
    email_verified_at: string | null;
    session_id: string;
  }>;

  const row = rows[0];
  if (!row) return null;

  void sql.query(
    `update public.customer_auth_sessions
     set last_seen_at=now()
     where id=$1::uuid and last_seen_at < now() - interval '15 minutes'`,
    [row.session_id],
  ).catch(() => undefined);

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    emailVerifiedAt: row.email_verified_at,
    ownerKey: canonicalOwnerKey(row.id),
  };
}

export async function revokeCurrentSession() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return;

  const sql = getCatalogDb();
  await sql.query(
    `update public.customer_auth_sessions
     set revoked_at=coalesce(revoked_at,now())
     where token_hash=$1`,
    [hashToken(token)],
  );
}

export async function issueAuthToken(
  accountId: string,
  purpose: "verify_email" | "reset_password",
  hours: number,
) {
  const token = randomBytes(32).toString("base64url");
  const sql = getCatalogDb();

  await sql.query(
    `update public.customer_auth_tokens
     set used_at=coalesce(used_at,now())
     where account_id=$1::uuid and purpose=$2 and used_at is null`,
    [accountId, purpose],
  );

  await sql.query(
    `insert into public.customer_auth_tokens (
      account_id,purpose,token_hash,expires_at
    ) values ($1::uuid,$2,$3,now() + ($4 || ' hours')::interval)`,
    [accountId, purpose, hashToken(token), String(hours)],
  );

  return token;
}
