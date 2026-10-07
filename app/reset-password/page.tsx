import { ResetPasswordExperience } from "@/components/ResetPasswordExperience";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <ResetPasswordExperience token={token} />;
}
