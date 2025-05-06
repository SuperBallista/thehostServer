import { get } from 'svelte/store';
import { socketStore } from '../../common/store/socketStore';
import type { Socket } from 'socket.io-client';

// socketStore.ts
export async function awaitSocketReady(timeoutMs = 5000): Promise<Socket> {
    let current = get(socketStore);
  
    if (current?.connected) return current;
  
    return new Promise((resolve, reject) => {
      const start = Date.now();
  
      const unsub = socketStore.subscribe((socket) => {
        current = socket;
        if (socket?.connected) {
          unsub();
          resolve(socket);
        }
      });
  
      const check = setInterval(() => {
        if (current?.connected) {
          clearInterval(check);
          unsub();
          resolve(current);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(check);
          unsub();
          reject(new Error('⛔ 소켓이 초기화되지 않았습니다.'));
        }
      }, 50);
    });
  }
  