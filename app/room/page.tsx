import { DesignedRoomExperience } from "@/components/DesignedRoomExperience";

export default async function DesignedRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  const { design } = await searchParams;
  return <DesignedRoomExperience designId={design} />;
}
