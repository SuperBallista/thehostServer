// src/lib/store/socketStore.ts
import { get, writable } from 'svelte/store';
import  io  from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { closeMessageBox, showMessageBox } from '../messagebox/customStore';
import { authStore } from './authStore';
import { locationState, currentRoom, pageStore } from './pageStore';

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
    const current = get(socketStore);
    if (current?.connected) {
      closeMessageBox();
      return resolve();
    }

    socket = io(wsUrl, {
      auth: {
        token: get(authStore).token,
      },
      transports: ['websocket'],
      reconnection: false,
    });

    socketStore.set(socket);

    socket.on('connect', () => {
      console.log('✅ Socket.IO 연결됨');
      reconnectAttempts = 0;
    
      socket.emit('location:restore'); // 👈 명시적 요청
    
      socket.on('location:restore', ({ state, roomInfo }) => {
        console.log('📍 복원 위치:', state, roomInfo);
        locationState.set(state);
    
        if (state === 'room' && roomInfo) {
          currentRoom.set(roomInfo);
          pageStore.set('room');
        } else if (state === 'game') {
          currentRoom.set(roomInfo);
          pageStore.set('game');
        } else {
          pageStore.set('lobby');
        }
      });
    
      resolve(); // 연결 완료
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
          initSocket().catch((err) => console.error('재연결 실패:', err));
        }, delay);
      } else {
        showMessageBox('error', '연결 실패', '서버와 연결할 수 없습니다.');
      }
    });

    socket.on('connect_error', (err: Error) => {
      console.error('❗ Socket.IO 연결 오류:', err.message);
      reject(err);
    });

    socket.on('message', (data: string) => {
      console.log('📩 메시지 수신:', data);
    });
  });
}
