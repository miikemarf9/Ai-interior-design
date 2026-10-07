import { createHmac } from "node:crypto";
import { getCatalogDb } from "@/lib/catalog/neon";

type RateLimitResult = {
  allowed: boolean;
  configured: boolean;
  retryAfterSeconds: number;
  attempts: number;
};

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function rateLimitSecret() {
  return process.env.AUTH_RATE_LIMIT_SECRET || "";
}

export function authRateLimitConfigured() {
  return Boolean(rateLimitSecret());
}

export async function checkAuthRateLimit(args: {
  request: Request;
  action: "login" | "signup" | "forgot_password" | "resend_verification";
  identity?: string;
  limit?: number;
  windowMinutes?: number;
  blockMinutes?: number;
}): Promise<RateLimitResult> {
  const secret = rateLimitSecret();

  if (!secret) {
    return {
      allowed: process.env.NODE_ENV !== "production",
      configured: false,
      retryAfterSeconds: 0,
      attempts: 0,
    };
  }

  const material = [
    args.action,
    clientAddress(args.request),
    (args.identity || "").trim().toLowerCase(),
  ].join("|");

  const keyHash = createHmac("sha256", secret).update(material).digest("hex");
  const limit = args.limit ?? 8;
  const windowMinutes = args.windowMinutes ?? 15;
  const blockMinutes = args.blockMinutes ?? 20;
  const sql = getCatalogDb();

  const rows = await sql.query(
    `insert into public.security_rate_limits (
      key_hash,action,window_started_at,attempt_count,blocked_until,updated_at
    )
    values ($1,$2,now(),1,null,now())
    on conflict (key_hash,action) do update
    set
      window_started_at = case
        when public.security_rate_limits.window_started_at < now() - ($4 || ' minutes')::interval
          then now()
        else public.security_rate_limits.window_started_at
      end,
      attempt_count = case
        when public.security_rate_limits.window_started_at < now() - ($4 || ' minutes')::interval
          then 1
        else public.security_rate_limits.attempt_count + 1
      end,
      blocked_until = case
        when public.security_rate_limits.blocked_until is not null
          and public.security_rate_limits.blocked_until > now()
          then public.security_rate_limits.blocked_until
        when public.security_rate_limits.window_started_at < now() - ($4 || ' minutes')::interval
          then null
        when public.security_rate_limits.attempt_count + 1 > $3
          then now() + ($5 || ' minutes')::interval
        else null
      end,
      updated_at = now()
    returning
      attempt_count,
      blocked_until,
      greatest(
        0,
        extract(epoch from (coalesce(blocked_until,now()) - now()))
      )::int as retry_after_seconds`,
    [keyHash, args.action, limit, String(windowMinutes), String(blockMinutes)],
  ) as Array<{
    attempt_count: number;
    blocked_until: string | null;
    retry_after_seconds: number;
  }>;

  const row = rows[0];
  return {
    allowed: !row?.blocked_until,
    configured: true,
    retryAfterSeconds: row?.retry_after_seconds ?? 0,
    attempts: row?.attempt_count ?? 0,
  };
}
