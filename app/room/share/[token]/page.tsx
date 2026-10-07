import { DesignedRoomExperience } from "@/components/DesignedRoomExperience";

export default async function SharedDesignedRoomPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <DesignedRoomExperience shareToken={token} />;
}
