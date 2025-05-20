// src/lib/store/socketStore.ts
import { get, writable } from 'svelte/store';
import  io  from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { showMessageBox } from '../messagebox/customStore';
import { authStore } from './authStore';
import { locationState, currentRoom, pageStore } from './pageStore';

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
    setupCustomHandlers(socket);

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


function setupCustomHandlers(socket: Socket) {
  // 요청-응답 패턴에 맞게 수정
  socket.off('update:location:restore');
  socket.on('update:location:restore', ({ state, roomInfo, roomId }) => {
    console.log('📍 복원 위치:', state, roomId, roomInfo);
    locationState.set(state);
    roomId && roomInfo ? currentRoom.set(roomInfo) : null;
    pageStore.set(roomInfo ? state : 'lobby');
  });

  socket.on('message', (data: string) => {
    console.log('📩 메시지 수신:', data);
  });

  // emit은 요청용으로 prefix 붙여서
  socket.emit('request:location:restore');
}
