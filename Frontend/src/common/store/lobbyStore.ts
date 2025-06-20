import { get, writable } from 'svelte/store';
import type { Room } from '../../page/lobby/lobby.type';
import { closeMessageBox, showMessageBox } from '../messagebox/customStore';
import { currentRoom, locationState, pageStore } from './pageStore';
import { awaitSocketReady } from '../utils/awaitSocketReady';
import type { userRequest } from './synchronize.type';
import { authStore } from './authStore';


export const rooms = writable<Room[]>([])

export async function getRoomList(page: number = 1) {
  const socket = await awaitSocketReady();
    socket.emit('request',{ page });
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
  const token = get(authStore).token
  const user = get(authStore).user
  if (!token) return showMessageBox(`error`, '사용자 정보 없음', '사용자 정보가 없습니다. 다시 로그인하세요.')
  if (!user) return showMessageBox(`error`, '사용자 정보 없음', '사용자 정보가 없습니다. 다시 로그인하세요.') 
  const requestData:userRequest = { token, user, createRoom:roomName }
  socket.emit('request', requestData);
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
  pageStore.set('lobby');
  closeMessageBox();
}

export async function onJoinRoom(roomId: string) {
  const socket = await awaitSocketReady();
  const token = get(authStore).token
  const user = get(authStore).user
  if (!token) return showMessageBox(`error`, '사용자 정보 없음', '사용자 정보가 없습니다. 다시 로그인하세요.')
  if (!user) return showMessageBox(`error`, '사용자 정보 없음', '사용자 정보가 없습니다. 다시 로그인하세요.') 
  const requestData:userRequest = {roomId, token, user, joinRoom:roomId}

  socket.emit('request', requestData);
}
