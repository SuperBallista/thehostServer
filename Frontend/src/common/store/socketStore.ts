// src/lib/store/socketStore.ts
import { get, writable } from 'svelte/store';
import  io  from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { showMessageBox } from '../messagebox/customStore';
import { authStore } from './authStore';
import { locationState, currentRoom, pageStore, type State, lobbyPage } from './pageStore';
import type { gameRoomDataResponse, lobbyDataResponse, userDataResponse } from './synchronize.type';
import { exitRoomState, rooms, setRoomState } from '../../page/lobby/lobbyStore';
import { count, gameTurn, hostAct, myStatus, playerId, region, surivorList, useRegionsNumber } from '../../page/game/common/gameStore';

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
  let prevChannel: string | null = null;

  // 유저 정보는 항상 수신
;
  socket.on(`update:user:${get(authStore).user?.id}`, (responseData:userDataResponse) => {
    if (responseData.locationState) locationState.set(responseData.locationState)
    if (responseData.user) {
      const oldAuthStore = get(authStore)
      oldAuthStore.user = responseData.user
      authStore.set(oldAuthStore)
    }
    if (responseData.token) {
      const oldAuthStore = get(authStore)
      oldAuthStore.token = responseData.token
      authStore.set(oldAuthStore)
    }
  });

  // location 상태에 따라 수신 채널 변경
  locationState.subscribe((state:State) => {

    // 새로 구독할 채널 결정
    const newChannel = get(roomId)
      ?  `update:room:${get(roomId)}`
      : `update:lobby:${get(lobbyPage)}` 


    // 이전 채널 구독 해제
    if (prevChannel && prevChannel !== newChannel) {
      socket.off(prevChannel);
      console.log(`❎ Unsubscribed from ${prevChannel}`);
    }

    // 새 채널 구독
    if (newChannel && newChannel !== prevChannel) {
      socket.on(newChannel, (payload) => {

        console.log(`📡 Received ${newChannel}:`, payload);

        if (newChannel===`update:room:${get(roomId)}`) {updateLobbyData(payload)}
        else {updateRoomData(payload)}

      });
      console.log(`✅ Subscribed to ${newChannel}`);
      prevChannel = newChannel;
    }
  });
}

function updateLobbyData(payload:lobbyDataResponse){
  if (payload.page) lobbyPage.set(payload.page)
  if (payload.roomList) rooms.set(payload.roomList)
  if (payload.joinRoom) setRoomState(payload.joinRoom)
}

function updateRoomData(payload:gameRoomDataResponse){
  if (payload.roomData) currentRoom.set(payload.roomData) // 방정보 업데이트
  if (payload.exitRoom) exitRoomState() // 방나가기
  if (payload.gameTurn) gameTurn.set(payload.gameTurn) // 게임턴 넘기기
  if (payload.count) count.set(payload.count) // 게임 시간 넘기기
  if (payload.hostAct) hostAct.set(payload.hostAct) // 숙주 행동 업데이트
  if (payload.myStatus) myStatus.set(payload.myStatus) // 내 상태 업데이트
  if (payload.playerId) playerId.set(payload.playerId) // 플레이어 id 적용
  if (payload.region) region.set(payload.region) // 구역 업데이트
  if (payload.surivorList) surivorList.set(payload.surivorList) // 생존자 목록 업데이트
  if (payload.useRegionsNumber) useRegionsNumber.set(payload.useRegionsNumber) // 사용 구역 번호 업데이트

}