// src/lib/store/socketStore.ts
import { get, writable } from 'svelte/store';
import  io  from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { showMessageBox, closeMessageBox } from '../messagebox/customStore';
import { authStore } from './authStore';
import { locationState, currentRoom, pageStore, type State, lobbyPage } from './pageStore';
import type { userDataResponse } from './synchronize.type';
import { exitRoomState, rooms, setRoomState } from './lobbyStore';
import { playerId, playerState, playerRegion, playerNextRegion, playerAct, playerItems } from './playerStore';
import { gameTurn, turnTimer, updateMyStatus, updateOtherPlayers, resetGameState, syncWithServer } from './gameStateStore';
import { setPlayerNicknames, Survivor } from '../../page/game/game.type';

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsHost = window.location.host;
const wsUrl = `${wsProtocol}://${wsHost}`;

let isInitializing = false;
let isInitialized = false;

export const socketStore = writable<Socket | null>(null);
export const roomId = writable<string | null>(null);

export function initSocket(): Promise<void> {
  // 이미 초기화 중이면 기다림
  if (isInitializing) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!isInitializing) {
          clearInterval(checkInterval);
          if (isInitialized) {
            resolve();
          } else {
            reject(new Error('소켓 초기화 실패'));
          }
        }
      }, 100);
    });
  }

  // 이미 초기화되어 있고 연결된 소켓이 있으면 그대로 반환
  const currentSocket = get(socketStore);
  if (currentSocket?.connected) {
    return Promise.resolve();
  }

  isInitializing = true;

  return new Promise((resolve, reject) => {
    const token = get(authStore).token;

    if (!token) {
      isInitializing = false;
      return reject(new Error('토큰 없음: 소켓 연결 불가'));
    }

    // 기존 소켓이 있으면 정리
    if (currentSocket) {
      currentSocket.removeAllListeners();
      currentSocket.disconnect();
    }

    const socket = createSocket(token);

    setupCoreHandlers(socket, resolve, reject);
    setupDynamicSubscriptions(socket);

    socketStore.set(socket);
    isInitialized = true;
    isInitializing = false;
  });
}

function createSocket(token: string): Socket {
  return io(wsUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,  // 자동 재연결 활성화
    reconnectionAttempts: 10,  // 최대 10회 재연결 시도
    reconnectionDelay: 1000,  // 첫 재연결 시도까지 1초 대기
    reconnectionDelayMax: 5000,  // 재연결 시도 간격 최대 5초
    timeout: 20000,  // 연결 타임아웃 20초
  });
}

function setupCoreHandlers(socket: Socket, resolve: () => void, reject: (e: Error) => void) {
  // 기존 리스너 제거
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.off('reconnect');
  socket.off('reconnect_attempt');
  socket.off('reconnect_error');
  socket.off('reconnect_failed');

  socket.on('connect', () => {
    console.log('✅ Socket.IO 연결됨');
    isInitialized = true;
    closeMessageBox(); // 재연결 성공 시 로딩 메시지 닫기
    
    // 재연결 후에는 이벤트 리스너를 재설정하지 않음
    // (이미 initSocket에서 설정되어 있고, socket.off/on으로 관리됨)
    resolve();
  });

  socket.on('disconnect', (reason: string) => {
    console.warn('❌ Socket.IO 연결 종료됨:', reason);
    isInitialized = false;
    
    // 의도적인 연결 종료가 아닌 경우만 재연결 시도
    if (reason !== 'io client disconnect') {
      showMessageBox('loading', '연결 끊어짐', '재연결을 시도합니다...');
    }
  });

  socket.on('connect_error', (err: Error) => {
    console.error('❗ Socket.IO 연결 오류:', err.message);
    isInitialized = false;
    // 초기 연결 시에만 reject
    if (!socket.connected && isInitializing) {
      reject(err);
    }
  });

  // 재연결 관련 이벤트
  socket.on('reconnect', (attemptNumber: number) => {
    console.log(`✅ 재연결 성공! (시도 횟수: ${attemptNumber})`);
    isInitialized = true;
    closeMessageBox();
  });

  socket.on('reconnect_attempt', (attemptNumber: number) => {
    console.log(`🔄 재연결 시도 중... (${attemptNumber}번째)`);
    showMessageBox('loading', '재연결 시도', `서버에 재연결을 시도합니다... (${attemptNumber}/10)`);
  });

  socket.on('reconnect_error', (err: Error) => {
    console.error('❌ 재연결 오류:', err.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ 재연결 실패!');
    showMessageBox('error', '연결 실패', '서버와의 연결을 복구할 수 없습니다. 페이지를 새로고침해주세요.');
  });
}

function setupDynamicSubscriptions(socket: Socket) {
  // 기존 리스너 제거
  console.log('🔧 update 리스너 제거');
  socket.off('update');

  // 새로운 리스너 등록
  console.log('🔧 update 리스너 등록');
  socket.on('update', (responseData: userDataResponse) => {
    console.log('📨 update 이벤트 수신:', responseData);
    updateData(responseData);
  });
}


function updateData(payload: userDataResponse) {
  console.log('updateData received:', payload);
  
  // 위치 상태 업데이트
  if (payload.locationState) {
    locationState.set(payload.locationState);
    
    // 페이지 자동 변경
    if (payload.locationState === 'lobby') pageStore.set('lobby');
    else if (payload.locationState === 'room') pageStore.set('room');
    else if (payload.locationState === 'game') pageStore.set('game');

    closeMessageBox();
  }

  // 사용자 정보 업데이트
  if (payload.user) {
    const oldAuthStore = get(authStore);
    oldAuthStore.user = payload.user;
    authStore.set(oldAuthStore);
  }

  if (payload.token) {
    const oldAuthStore = get(authStore);
    oldAuthStore.token = payload.token;
    authStore.set(oldAuthStore);
  }

  // 로비 관련 업데이트
  if (payload.page) lobbyPage.set(payload.page);
  if (payload.roomList) rooms.set(payload.roomList);
  if (payload.joinRoom) setRoomState(payload.joinRoom);

  // 방 관련 업데이트
  if (payload.roomData) currentRoom.set(payload.roomData);
  
  // exitRoom이 있으면 exitRoomState를 호출하되, locationState가 함께 전달된 경우는 건너뛴다
  // (이미 위에서 locationState를 처리했으므로)
  if (payload.exitRoom && !payload.locationState) {
    exitRoomState();
  }

  // 게임 관련 업데이트
  if (payload.gameTurn) gameTurn.set(payload.gameTurn);
  // count는 syncWithServer에서 처리됨
  // playerId는 별도로 설정 (playerStore에서 관리)
  if (payload.playerId !== undefined) {
    playerId.set(payload.playerId);
  }
  
  // 게임 관련 모든 업데이트는 syncWithServer로 통합 처리
  const hasGameData = payload.myStatus || payload.survivorList || payload.gameTurn || 
                     payload.region || payload.hostAct || payload.count || 
                     payload.useRegionsNumber || payload.endGame || payload.chatMessage;
  
  if (hasGameData) {
    syncWithServer(payload);
  }
  
  // 게임 시작 시 플레이어 닉네임 매핑 설정
  if (payload.locationState === 'game' && payload.roomData) {
    setPlayerNicknames(payload.roomData.players);
  }

  // 알림 처리
  if (payload.alarm) {
    showMessageBox(payload.alarm.img as "error" | "confirm" | "alert" | "loading" | "input" | "success" | "tips" | "turn", '알림', payload.alarm.message);
  }
}

// 소켓 정리 함수
export function cleanupSocket(): void {
  const currentSocket = get(socketStore);
  if (currentSocket) {
    currentSocket.removeAllListeners();
    currentSocket.disconnect();
    socketStore.set(null);
  }
  
  isInitialized = false;
  isInitializing = false;
}

// 소켓 상태 확인 함수 (디버깅용)
export function getSocketStatus(): {
  isInitialized: boolean;
  isInitializing: boolean;
  hasSocket: boolean;
  isConnected: boolean;
} {
  const currentSocket = get(socketStore);
  return {
    isInitialized,
    isInitializing,
    hasSocket: !!currentSocket,
    isConnected: currentSocket?.connected || false
  };
}

// 소켓 이벤트 리스너 상태 확인 (디버깅용)
export function checkSocketListeners(): void {
  const currentSocket = get(socketStore);
  if (currentSocket) {
    console.log('🔍 소켓 리스너 상태 확인:');
    console.log('- 연결 상태:', currentSocket.connected);
    console.log('- 소켓 ID:', currentSocket.id);
  } else {
    console.log('�� 소켓이 없습니다');
  }
}
