import { normalizeEmail, type SessionAccount } from "@/lib/auth";

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  return allowed.includes(normalizeEmail(email));
}

export function isAdminAccount(account: SessionAccount | null) {
  return Boolean(account?.emailVerifiedAt && isAdminEmail(account.email));
}
