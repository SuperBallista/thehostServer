// src/common/store/pageStore.ts
import { writable } from 'svelte/store';
import type { Room } from '../../page/lobby/lobby.type';

export type Page =
  | 'login'
  | 'lobby'
  | 'room'
  | 'game'
  | 'result'
  | 'setting'
  
export const pageStore = writable<Page>('login');


export const locationState = writable<string>('lobby')


export const currentRoom = writable<Room|null>(null);