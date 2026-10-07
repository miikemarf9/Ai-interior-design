function appUrl(origin?: string) {
  return (process.env.APP_URL || origin || "").replace(/\/$/, "");
}

export async function sendAccountEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_FROM_EMAIL;

  if (!apiKey || !from) return { sent: false, reason: "not_configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      tags: [{ name: "product", value: "roomfound" }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Account email failed", response.status, detail.slice(0, 500));
    return { sent: false, reason: "provider_error" as const };
  }

  return { sent: true as const };
}

export async function sendVerificationEmail(email: string, token: string, origin?: string) {
  const url = `${appUrl(origin)}/api/auth/verify?token=${encodeURIComponent(token)}`;
  return sendAccountEmail({
    to: email,
    subject: "Verify your Roomfound account",
    html: `<div style="font-family:Arial,sans-serif;color:#172019;max-width:560px;margin:auto;padding:32px">
      <h1 style="font-family:Georgia,serif;font-weight:400">Verify your Roomfound account</h1>
      <p>Confirm your email to secure your saved rooms and unlock your 3 free design credits.</p>
      <p style="margin:28px 0"><a href="${url}" style="background:#172019;color:white;padding:13px 18px;text-decoration:none;border-radius:999px">Verify my email</a></p>
      <p style="font-size:12px;color:#687168">This link expires in 24 hours.</p>
    </div>`,
  });
}

export async function sendResetEmail(email: string, token: string, origin?: string) {
  const url = `${appUrl(origin)}/reset-password?token=${encodeURIComponent(token)}`;
  return sendAccountEmail({
    to: email,
    subject: "Reset your Roomfound password",
    html: `<div style="font-family:Arial,sans-serif;color:#172019;max-width:560px;margin:auto;padding:32px">
      <h1 style="font-family:Georgia,serif;font-weight:400">Reset your password</h1>
      <p>Use the link below to choose a new Roomfound password.</p>
      <p style="margin:28px 0"><a href="${url}" style="background:#172019;color:white;padding:13px 18px;text-decoration:none;border-radius:999px">Reset password</a></p>
      <p style="font-size:12px;color:#687168">This link expires in 1 hour.</p>
    </div>`,
  });
}
