import { get, writable, derived } from "svelte/store";
import type { GamePlayerStatusInterface, SurvivorInterface, ItemInterface, MyPlayerState } from "./synchronize.type";

// === 내 플레이어 상태 스토어 ===
// 이 파일은 오직 나(현재 플레이어)의 상태만 관리합니다.
// 게임 전체 상태는 gameStateStore.ts에서 관리합니다.

// 플레이어 기본 정보
export const playerId = writable<number | undefined>(undefined);
export const playerState = writable<MyPlayerState>('alive'); // 자신의 상태는 alive 또는 host만 가능
export const playerRegion = writable<number>(0);
export const playerNextRegion = writable<number>(0);
export const playerAct = writable<'runaway' | 'hide' | 'lure'>('lure');
export const playerItems = writable<ItemInterface[]>([]);
export const playerCanEscape = writable<boolean>(true); // 도주 가능 여부

// === 파생 스토어 ===
// myStatus는 gameStateStore.ts에서 관리

// === 업데이트 함수 ===

// 플레이어 상태 업데이트
export function updatePlayerStatus(data: GamePlayerStatusInterface) {
  if (data.state !== undefined) playerState.set(data.state);
  if (data.region !== undefined) playerRegion.set(data.region);
  if (data.next !== undefined) playerNextRegion.set(data.next);
  if (data.act !== undefined) playerAct.set(data.act);
  if (data.items !== undefined) {
    playerItems.set(data.items);
  }
  if (data.canEscape !== undefined) playerCanEscape.set(data.canEscape);
}

// 다음 이동 구역 설정
export function setNextRegion(regionId: number) {
  playerNextRegion.set(regionId);
}

// 행동 설정
export function setPlayerAct(act: 'runaway' | 'hide' | 'lure') {
  playerAct.set(act);
}

// 아이템 추가
export function addItem(item: ItemInterface) {
  playerItems.update(items => [...items, item]);
}

// 아이템 제거
export function removeItem(itemIndex: number) {
  playerItems.update(items => items.filter((_, i) => i !== itemIndex));
}

// 카운트다운 로직은 gameStateStore로 이동

// === 플레이어 상태 초기화 ===
export function resetPlayerStore() {
  playerId.set(undefined);
  playerState.set('alive');
  playerRegion.set(0);
  playerNextRegion.set(0);
  playerAct.set('lure');
  playerItems.set([]);
  playerCanEscape.set(true);
}