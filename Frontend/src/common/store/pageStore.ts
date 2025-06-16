// src/common/store/pageStore.ts
import { writable } from 'svelte/store';
import type { Room } from '../../page/lobby/lobby.type';

export type Page =
  | 'login'
  | 'lobby'
  | 'host'
  | 'room'
  | 'game'
  | 'result'
  | 'setting'

 export type State = 'lobby' | 'host' | 'room' | 'game'
  
export const pageStore = writable<Page>('login');

export const lobbyPage = writable<number>(1);


export const locationState = writable<State>('lobby')


export const currentRoom = writable<Room|null>(null);