import { get } from "svelte/store";
import { awaitSocketReady } from "../../common/utils/awaitSocketReady";
import { currentRoom, locationState, pageStore } from "../../common/store/pageStore";
import type { Room } from "../lobby/lobby.type";
import { closeMessageBox, showMessageBox } from "../../common/messagebox/customStore";

let roomUpdateHandler: ((roomData: Room) => void) | null = null;

export async function relaodRoomInfo() {
  const socket = await awaitSocketReady();
  const roomId = get(currentRoom)?.id;
  const eventName = `room:update:${roomId}`;

  socket.emit('room:join', { roomId });

  // 기존 핸들러 제거 (정확한 함수로 off)
  if (roomUpdateHandler) {
    socket.off(eventName, roomUpdateHandler);
  }

  // 새 핸들러 등록
  roomUpdateHandler = (room: Room) => {
    currentRoom.set({...room, players:[...room.players]});
  };
  socket.on(eventName, roomUpdateHandler);
}

export async function reloadOffRoomInfo() {
  const socket = await awaitSocketReady();
  const roomId = get(currentRoom)?.id;
  const eventName = `room:update:${roomId}`;
  socket.emit(`lobby:exitToLobby`, roomId) 
  socket.emit('room:leave', { roomId });
  if (roomUpdateHandler) {
    socket.off(eventName, roomUpdateHandler);
    roomUpdateHandler = null;
  }
}


   export async function leaveRoom() {
    // 메시지 박스 보여주고 이후 라우팅 또는 상태 초기화 처리
    showMessageBox('loading', '방 나가기', '로비로 이동 중입니다...');
    await reloadOffRoomInfo()
    pageStore.set('lobby')
    locationState.set('lobby')
    currentRoom.set(null)
    const socket = await awaitSocketReady();
    socket.emit('location:update', {
  state: 'lobby',
  roomId: null,
});    
    closeMessageBox();
}

export async function startGame() {
  showMessageBox('loading', '게임 시작', '게임을 시작합니다...');

  // TODO: 서버에 게임 시작 요청 보내기
  // 예: socket.emit('room:start', { roomId: $currentRoom.id });

  closeMessageBox();
}

