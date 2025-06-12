import {get, writable } from "svelte/store";
import { HostAct, Region, Survivor, type GamePlayerStatus } from "../game.type";


export const playerId = writable<number | undefined>(undefined) // 플레이어 ID
export const myStatus = writable<GamePlayerStatus | undefined>(undefined) // 내정보
export const useRegionsNumber = writable<number>(6) // 사용 구역 갯수
export const gameTurn = writable<number>(1) // 게임 턴수
export const count = writable<number>(60)
export const survivorList = writable<Survivor[]>([]) // 보이는 생존자목록
export const hostAct = writable<HostAct | null>() // 숙주 행동
export const region = writable<Region>() // 구역 정보

function startCountdown() {
  if (get(count) > 0) {
    setTimeout(() => {
      count.update(n => n - 1);
      startCountdown(); // 다시 호출
    }, 1000);
  }
}

startCountdown()