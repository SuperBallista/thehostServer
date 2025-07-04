import { writable } from 'svelte/store';
import type { ItemInterface } from './synchronize.type';

// 아이템 사용 기록
export interface ItemUseRecord {
  playerId: number;
  item: ItemInterface;
  targetPlayerId?: number;
  turn: number;
  result?: string;
}

export const itemUseHistory = writable<ItemUseRecord[]>([]);

// 아이템 사용 기록 추가
export function addItemUseRecord(record: ItemUseRecord) {
  itemUseHistory.update(history => [...history, record]);
}

// 아이템 사용 기록 초기화
export function resetItemHistory() {
  itemUseHistory.set([]);
}