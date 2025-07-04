import { writable, get } from 'svelte/store';
import type { ItemInterface } from './synchronize.type';

// 좀비 정보 인터페이스
export interface ZombieInfo {
  playerId: number;
  targetId: number | null;
  region: number;
  nextRegion: number;
  turnsUntilMove: number;
}

// 호스트 관련 스토어
export const isHost = writable<boolean>(false);
export const zombies = writable<ZombieInfo[]>([]);
export const canInfect = writable<boolean>(true);
export const infectTarget = writable<number | null>(null);

// 좀비 정보 업데이트
export function updateZombieInfo(zombieList: any[]) {
  const zombieInfos: ZombieInfo[] = zombieList.map(zombie => ({
    playerId: zombie.playerId,
    targetId: zombie.targetId,
    region: zombie.region,
    nextRegion: zombie.next,
    turnsUntilMove: zombie.leftTurn
  }));
  zombies.set(zombieInfos);
}

// 호스트 상태 초기화
export function resetHostState() {
  isHost.set(false);
  zombies.set([]);
  canInfect.set(true);
  infectTarget.set(null);
}