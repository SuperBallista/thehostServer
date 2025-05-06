// src/common/store/pageStore.ts
import { get, writable } from 'svelte/store';
import type { Room } from '../../page/lobby/lobby.type';

export type Page =
  | 'login'
  | 'lobby'
  | 'room'
  | 'game'
  | 'result'
  | 'setting'
  
export const pageStore = writable<Page>('login');

type location = 'lobby' | 'room' | 'game'

export const locationState = writable<location>('lobby')



export const currentRoom = writable<Room|null>(null);