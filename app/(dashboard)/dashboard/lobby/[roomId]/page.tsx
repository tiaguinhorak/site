import { LobbyRoomDetail } from "@/components/dashboard/lobby-room-detail";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default async function LobbyRoomPage({ params }: Props) {
  const { roomId } = await params;
  return <LobbyRoomDetail roomId={roomId} />;
}
