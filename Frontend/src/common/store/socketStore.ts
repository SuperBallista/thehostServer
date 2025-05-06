// src/lib/store/socketStore.ts
import { get, writable } from 'svelte/store';
import  io  from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { closeMessageBox, showMessageBox } from '../messagebox/customStore';
import { authStore } from './authStore';
import { locationState, currentRoom } from './pageStore';

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsHost = window.location.host;
const wsUrl = `${wsProtocol}://${wsHost}`;

let socket: Socket = io(`${window.location.protocol}//${wsHost}`);
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

export const socketStore = writable<Socket | null>(null);

export const roomId = writable<string | null>(null);

export function initSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket && socket.connected) {
      socketStore.set(socket);
      closeMessageBox();
      return resolve(); // ✅ 이미 연결되어 있으면 즉시 resolve
    }

    socket = io(wsUrl, {
      auth: {
        token: get(authStore).token,
        locationState: get(locationState),
        currentRoom: get(currentRoom)
      },
      transports: ['websocket'],
      reconnection: false,
    });

    socketStore.set(socket);

    socket.on('connect', () => {
      console.log('✅ Socket.IO 연결됨');
      reconnectAttempts = 0;
      socket.emit('lobby:getRoomList'); // 최초 연결 시점에 목록 요청
      resolve(); // ✅ 연결 완료 시 resolve
    });

    socket.on('disconnect', () => {
      console.warn('❌ Socket.IO 연결 종료됨');
      socketStore.set(null);
      showMessageBox('loading', '연결 끊어짐', '연결이 끊어져 재연결을 시도합니다');

      if (reconnectAttempts < 10) {
        const delay = Math.min(5000, 1000 + reconnectAttempts * 1000);
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          console.log(`🔁 Socket 재연결 시도 (${reconnectAttempts})`);
          initSocket().catch(() => {}); // 재연결 시 실패 무시
        }, delay);
      } else {
        showMessageBox('error', '연결 실패', '서버와 연결할 수 없습니다.');
      }
    });

    socket.on('connect_error', (err: Error) => {
      console.error('❗ Socket.IO 연결 오류:', err.message);
      reject(err); // ✅ 연결 실패 시 reject
    });

    socket.on('message', (data: string) => {
      console.log('📩 메시지 수신:', data);
    });
  });
}
