import { writable, get } from 'svelte/store';
import type { ItemInterface } from './synchronize.type';

// 좀비 정보 인터페이스
export interface ZombieInfo {
  playerId: number;
  targetId: number | undefined;
  region: number;
  nextRegion: number;
  turnsUntilMove: number;
  survivorsInRegion?: number[]; // 좀비와 같은 구역에 있는 생존자 ID 목록
}

// 호스트 관련 스토어
export const isHost = writable<boolean>(false);
export const zombies = writable<ZombieInfo[]>([]);
export const canInfect = writable<boolean>(true);
export const infectTarget = writable<number | null>(null);

// 좀비 정보 업데이트
interface ZombieData {
  playerId: number;
  targetId: number | undefined;
  region: number;
  nextRegion: number;
  leftTurn: number;
  survivorsInRegion?: number[];
}

export function updateZombieInfo(zombieList: ZombieData[]) {
  console.log('[hostStore] updateZombieInfo 호출됨:', zombieList);
  
  if (!zombieList || !Array.isArray(zombieList)) {
    console.warn('[hostStore] zombieList가 유효하지 않음:', zombieList);
    zombies.set([]);
    return;
  }
  
  const zombieInfos: ZombieInfo[] = zombieList.map(zombie => ({
    playerId: zombie.playerId,
    targetId: zombie.targetId,
    region: zombie.region,
    nextRegion: zombie.nextRegion,
    turnsUntilMove: zombie.leftTurn,
    survivorsInRegion: zombie.survivorsInRegion || []
  }));
  
  console.log('[hostStore] 좀비 정보 업데이트:', zombieInfos);
  zombies.set(zombieInfos);
}

// 호스트 상태 초기화
export function resetHostState() {
  isHost.set(false);
  zombies.set([]);
  canInfect.set(true);
  infectTarget.set(null);
}