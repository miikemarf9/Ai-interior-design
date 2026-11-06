import { AccountExperience } from "@/components/AccountExperience";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const enabledOAuthProviders = [
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "google" : null,
    process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET ? "facebook" : null,
    process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET ? "x" : null,
  ].filter(Boolean) as Array<"google" | "facebook" | "x">;
  return <AccountExperience enabledOAuthProviders={enabledOAuthProviders} />;
}
