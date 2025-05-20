import type { Socket } from "socket.io";

export function moveToRoom(client: Socket, roomId: string) {
  const targetRoom = `room:${roomId}`;

  // socket.io는 기본적으로 자기 자신의 ID도 room으로 가지고 있으므로 제외
  const currentRooms = Array.from(client.rooms).filter(r => r !== client.id);

  // ✅ 이미 해당 room에 있다면 추가 조치 없이 리턴
  if (currentRooms.includes(targetRoom)) return;

  // ✅ 다른 방들(예: 이전 게임 방, 로비 등)에서 나가고
  for (const room of currentRooms) {
    client.leave(room);
  }
  // ✅ 새 방으로 join
  client.join(targetRoom);
}

export function moveToLobby(client: Socket) {
  const currentRooms = Array.from(client.rooms).filter(r => r !== client.id);

  // ✅ 모든 "room:" prefix 방에서 나감
  for (const room of currentRooms) {
    if (room.startsWith('room:')) {
      client.leave(room);
    }
  }

  // ✅ 로비는 이미 들어갔는지와 관계없이 join (중복은 socket.io가 자동 무시함)
  client.join('lobby');
}
