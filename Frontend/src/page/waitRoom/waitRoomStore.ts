import { get } from "svelte/store";
import { awaitSocketReady } from "../../common/utils/awaitSocketReady";
import { currentRoom, locationState, pageStore } from "../../common/store/pageStore";
import type { Room } from "../lobby/lobby.type";
import { closeMessageBox, showMessageBox } from "../../common/messagebox/customStore";

let roomUpdateHandler: ((roomData: Room) => void) | null = null;

export async function relaodRoomInfo() {
  const socket = await awaitSocketReady();
  const roomId = get(currentRoom)?.id;

  if (!roomId) return;

  // 요청: 방 정보 재조회 및 socket room join
  socket.emit('request:room:join', { roomId });

  if (roomUpdateHandler) {
    socket.off('update:room:data', roomUpdateHandler);
  }
  socket.off(`update:room:closed`)

  // 새로운 핸들러 등록
  roomUpdateHandler = (room: Room) => {
    currentRoom.set({ ...room, players: [...room.players] });
  };


  socket.on('update:room:data', roomUpdateHandler);
  socket.on('update:room:closed', async () => await leaveRoom('방이 사라졌습니다'));
}

export async function reloadOffRoomInfo() {
  const socket = await awaitSocketReady();
  const roomId = get(currentRoom)?.id;
  if (!roomId) return;

  // 서버에 방 나가기 요청
  socket.emit('request:room:exit', { roomId });
  socket.emit('request:room:leave', { roomId });

  // 핸들러 제거
  if (roomUpdateHandler) {
    socket.off('update:room:data', roomUpdateHandler);
    roomUpdateHandler = null;
  }
    socket.off(`update:room:closed`)
}

export async function leaveRoom(message:string) {
  showMessageBox('loading', '로비 이동', message);

  await reloadOffRoomInfo();

  // 클라이언트 상태 초기화
  pageStore.set('lobby');
  locationState.set('lobby');
  currentRoom.set(null);

  const socket = await awaitSocketReady();
  socket.emit('request:location:update', {
    state: 'lobby',
    roomId: null,
  });

  closeMessageBox();
}

export async function startGame() {
  showMessageBox('loading', '게임 시작', '게임을 시작합니다...');

  const socket = await awaitSocketReady();
  const roomId = get(currentRoom)?.id;
  if (roomId) {
    socket.emit('request:room:start', { roomId });
  }

  closeMessageBox();
}
