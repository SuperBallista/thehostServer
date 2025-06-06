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

  // 새로운 핸들러 등록
  roomUpdateHandler = (room: Room) => {
    currentRoom.set(room);
  };

}


export async function sendRoomExitRequest(roomId: string) {
  const socket = await awaitSocketReady();
  socket.emit('request:room:exit', { roomId });
}



export async function leaveRoom(message: string) {
  showMessageBox('loading', '로비 이동', message);

  resetClientStateToLobby();

  await notifyServerLocationChange();

  closeMessageBox();
}

function resetClientStateToLobby() {
  pageStore.set('lobby');
  locationState.set('lobby');
  currentRoom.set(null);
}

async function notifyServerLocationChange() {
  const socket = await awaitSocketReady();
  socket.emit('request:location:update', {
    locationState: 'lobby',
    roomId: null,
  });
}

export async function startGame() {
  showMessageBox('loading', '게임 시작', '게임을 시작합니다...');

  const socket = await awaitSocketReady();
  const roomId = get(currentRoom)?.id;
  if (roomId) {
    socket.emit('request:room:start', { roomId });
  }  
  pageStore.set('game')
  
  closeMessageBox();
}

export async function handleBotSetting() {
  const roomData = get(currentRoom)
  if (!roomData) return
  const socket = await awaitSocketReady();
  roomData.bot = !roomData.bot
  socket.emit(`request:room:setting`, {roomData});  
  currentRoom.set(roomData)  
}