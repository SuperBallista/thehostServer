import { get, writable } from 'svelte/store';
import type { Room } from './lobby.type';
import { showMessageBox } from '../../common/messagebox/customStore';
import { currentRoom, lobbyPage, locationState, pageStore } from '../../common/store/pageStore';
import { awaitSocketReady } from '../../common/utils/awaitSocketReady';


export const rooms = writable<Room[]>([])

export async function getRoomList(page: number = 1) {
  const socket = await awaitSocketReady();
    socket.emit('request:lobby:list',{ page });
}

// UI 요청 + 트리거
export async function makeRoom() {
  const userResponse = await showMessageBox(
    'input',
    '방 생성하기',
    '방 이름을 지정해주세요',
    undefined,
    [{ key: 'name', label: ' ', placeholder: '방 제목 입력' }]
  );

  if (!userResponse.success) return;

  const roomName = userResponse.values?.name || '빠른 게임방';
  const socket = await awaitSocketReady();
  socket.emit('request:room:create', { name: roomName });
}

// 상태 저장 로직만 따로
export function setRoomState(room: Room) {
  currentRoom.set(room);
  locationState.set('room');
  pageStore.set('room');
}

export function exitRoomState(){
  currentRoom.set(null);
  locationState.set(`lobby`);
  pageStore.set('lobby')
}
