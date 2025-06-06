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
  socket.off(`update:room:${roomId}:start`)

  // 새로운 핸들러 등록
  roomUpdateHandler = (room: Room) => {
    currentRoom.set(room);
  };


  socket.on('update:room:data', roomUpdateHandler);
  socket.on('update:room:closed', async () => await leaveRoom('방이 사라졌습니다'));
  socket.on(`update:room:${roomId}:start`, () => {
    socket.off(`update:room:data`);
    socket.off(`update:room:closed`);
    locationState.set('game');
    pageStore.set('game');
  } )
}


export async function sendRoomExitRequest(roomId: string) {
  const socket = await awaitSocketReady();
  socket.emit('request:room:exit', { roomId });
}

export async function clearRoomEventHandlers(roomId:string) {
  const socket = await awaitSocketReady();
  if (roomUpdateHandler) {
    socket.off('update:room:data', roomUpdateHandler);
    socket.off(`update:room:closed`)
    socket.off(`update:room:${roomId}:start`)

    roomUpdateHandler = null;
  }
  socket.off('update:room:closed');
}

export async function reloadOffRoomInfo() {
  const roomId = get(currentRoom)?.id;
  if (!roomId) return;

  await sendRoomExitRequest(roomId);
  await clearRoomEventHandlers(roomId);
}


export async function leaveRoom(message: string) {
  showMessageBox('loading', '로비 이동', message);

  await reloadOffRoomInfo();  // 실제로는 두 단계로 나눠져 있음

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