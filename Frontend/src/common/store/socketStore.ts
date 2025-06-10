// src/lib/store/socketStore.ts
import { get, writable } from 'svelte/store';
import  io  from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { showMessageBox } from '../messagebox/customStore';
import { authStore } from './authStore';
import { locationState, currentRoom, pageStore, type State, lobbyPage } from './pageStore';
import type { userDataResponse } from './synchronize.type';
import { exitRoomState, rooms, setRoomState } from '../../page/lobby/lobbyStore';
import { count, gameTurn, hostAct, myStatus, playerId, region, survivorList, useRegionsNumber } from '../../page/game/common/gameStore';

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsHost = window.location.host;
const wsUrl = `${wsProtocol}://${wsHost}`;

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

export const socketStore = writable<Socket | null>(null);

export const roomId = writable<string | null>(null);

export function initSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    const token = get(authStore).token;

    if (!token) {
      return reject(new Error('토큰 없음: 소켓 연결 불가'));
    }

    const socket = createSocket(token);

    setupCoreHandlers(socket, resolve, reject);
    setupDynamicSubscriptions(socket);

    socketStore.set(socket);
  });
}

function createSocket(token: string): Socket {
  return io(wsUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });
}
function setupCoreHandlers(socket: Socket, resolve: () => void, reject: (e: Error) => void) {
  socket.on('connect', () => {
    console.log('✅ Socket.IO 연결됨');
    reconnectAttempts = 0;
    resolve();
  });

  socket.on('disconnect', () => {
    console.warn('❌ Socket.IO 연결 종료됨');
    socketStore.set(null);
    showMessageBox('loading', '연결 끊어짐', '재연결을 시도합니다');

    if (reconnectAttempts < 10) {
      const delay = Math.min(5000, 1000 + reconnectAttempts * 1000);
      reconnectTimeout = setTimeout(() => {
        reconnectAttempts++;
        initSocket().catch(console.error);
      }, delay);
    } else {
      showMessageBox('error', '연결 실패', '서버와 연결할 수 없습니다.');
    }
  });

  socket.on('connect_error', (err: Error) => {
    console.error('❗ Socket.IO 연결 오류:', err.message);
    reject(err);
  });
}



function setupDynamicSubscriptions(socket: Socket) {

  socket.on(`update`, (responseData:userDataResponse) => {
    updateData(responseData)
})}

function updateData(payload:userDataResponse){
    if (payload.locationState) locationState.set(payload.locationState)
    if (payload.user) {
      const oldAuthStore = get(authStore)
      oldAuthStore.user = payload.user
      authStore.set(oldAuthStore)
    }
    if (payload.token) {
      const oldAuthStore = get(authStore)
      oldAuthStore.token = payload.token
      authStore.set(oldAuthStore)
    }

  if (payload.page) lobbyPage.set(payload.page)
  if (payload.roomList) rooms.set(payload.roomList)
  if (payload.joinRoom) setRoomState(payload.joinRoom)


  if (payload.roomData) currentRoom.set(payload.roomData) // 방정보 업데이트
  if (payload.exitRoom) exitRoomState() // 방나가기
  if (payload.gameTurn) gameTurn.set(payload.gameTurn) // 게임턴 넘기기
  if (payload.count) count.set(payload.count) // 게임 시간 넘기기
  if (payload.hostAct) get(hostAct)?.updateData(payload.hostAct.zombieList) // 좀비 리스트 업데이트
  if (payload.myStatus) get(myStatus)?.updateData(payload.myStatus) // 내 상태 업데이트
  if (payload.playerId) playerId.set(payload.playerId) // 플레이어 id 적용
  if (payload.region) get(region).updateData(payload.region.chatLog, payload.region.regionMessageList) // 구역 업데이트
  if (payload.survivorList) {
const sList = get(survivorList);
const pList = payload.survivorList ?? [];

sList.forEach((s, i) => {
  if (pList[i]) s.updateData(pList[i]);
});

   } // 생존자 목록 업데이트
  if (payload.useRegionsNumber) useRegionsNumber.set(payload.useRegionsNumber) // 사용 구역 번호 업데이트

}