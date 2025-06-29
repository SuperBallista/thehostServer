import { writable, derived, get } from 'svelte/store';
import type { 
  GamePlayerStatusInterface, 
  SurvivorInterface,
  ItemInterface 
} from './synchronize.type';
import { 
  playerId, 
  playerState, 
  playerRegion, 
  playerNextRegion, 
  playerAct, 
  playerItems 
} from './playerStore';

// 게임 기본 정보
export const gameId = writable<string>('');
export const gameTurn = writable<number>(1);
export const turnTimer = writable<number>(60); // 기본값을 60초로 설정
export const gamePhase = writable<'waiting' | 'playing' | 'ended'>('waiting');
export const gameResult = writable<'infected' | 'killed' | 'cure' | null>(null);

// 지역 관련
export const totalRegions = writable<number>(6);
export const regionNames = writable<string[]>([
  '해안가', '폐건물', '정글', '동굴', '산 정상', '개울가'
]);

// 플레이어 상태
export interface PlayerStatus {
  playerId: number;
  state: 'alive' | 'host' | 'zombie' | 'killed' | 'infected' | 'you';
  region: number;
  nextRegion: number;
  act: 'runaway' | 'hide' | 'lure';
  items: ItemInterface[];
  infectedTurn?: number;
}

// myStatus를 playerStore의 값들을 합쳐서 파생 스토어로 제공
export const myStatus = derived(
  [playerId, playerState, playerRegion, playerNextRegion, playerAct, playerItems],
  ([$playerId, $state, $region, $nextRegion, $act, $items]) => {
    if ($playerId === undefined) return null;
    
    return {
      playerId: $playerId,
      nickname: '', // 서버에서 받아야 함
      state: $state,
      region: $region,
      nextRegion: $nextRegion,
      act: $act,
      items: $items
    } as PlayerStatus;
  }
);

// 다른 플레이어들 상태
export const otherPlayers = writable<Map<number, PlayerStatus>>(new Map());

// 같은 구역 플레이어 (파생 스토어)
export const playersInMyRegion = derived(
  [myStatus, otherPlayers],
  ([$myStatus, $otherPlayers]) => {
    if (!$myStatus) return [];
    
    const players: PlayerStatus[] = [];
    $otherPlayers.forEach(player => {
      if (player.region === $myStatus.region && player.state !== 'killed') {
        players.push(player);
      }
    });
    return players;
  }
);

// 채팅 & 메시지 - synchronize.type에서 import해서 사용
// ChatMessage와 RegionMessage는 synchronize.type.ts에 정의됨

export const chatMessages = writable<any[]>([]);
// 구역 메시지 인터페이스
interface RegionMessage {
  message: string;
  region: number;
  isErased?: boolean;
}

export const regionMessages = writable<RegionMessage[]>([]);

// 무전기 연결
export interface WirelessConnection {
  fromPlayerId: number;
  toPlayerId: number;
  active: boolean;
}

// 마이크 메세지
export interface MicrophoneMessage {
  message: string;
  timeStamp: Date
}

export const wirelessConnections = writable<WirelessConnection[]>([]);

// 좀비 관련 (숙주 전용)
export interface ZombieInfo {
  playerId: number;
  targetId: number | null;
  region: number;
  nextRegion: number;
  turnsUntilMove: number;
}

export const isHost = writable<boolean>(false);
export const zombies = writable<ZombieInfo[]>([]);
export const canInfect = writable<boolean>(true);
export const infectTarget = writable<number | null>(null);

// 아이템 사용 기록
export interface ItemUseRecord {
  playerId: number;
  item: ItemInterface;
  targetPlayerId?: number;
  turn: number;
  result?: string;
}

export const itemUseHistory = writable<ItemUseRecord[]>([]);

// showMessageBox import
import { showMessageBox } from '../messagebox/customStore';

// 스토어 업데이트 함수들
export function updateGameState(data: any) {
  if (data.gameTurn !== undefined) gameTurn.set(data.gameTurn);
  if (data.turnTimer !== undefined) turnTimer.set(data.turnTimer);
  if (data.gamePhase !== undefined) gamePhase.set(data.gamePhase);
  if (data.endGame !== undefined) {
    gamePhase.set('ended');
    gameResult.set(data.endGame);
  }
}

export function updateMyStatus(status: GamePlayerStatusInterface) {
  // playerStore의 개별 스토어들을 업데이트
  if (status.state !== undefined) playerState.set(status.state);
  if (status.region !== undefined) playerRegion.set(status.region);
  if (status.next !== undefined) playerNextRegion.set(status.next);
  if (status.act !== undefined) playerAct.set(status.act);
  if (status.items !== undefined) playerItems.set(status.items);
}

export function updateOtherPlayers(survivors: SurvivorInterface[]) {
  const updatedPlayers = new Map<number, PlayerStatus>();
  const currentPlayers = get(otherPlayers);
  
  survivors.forEach(survivor => {
    const existing = currentPlayers.get(survivor.playerId);
    if (existing) {
      updatedPlayers.set(survivor.playerId, {
        ...existing,
        state: survivor.state,
        region: survivor.sameRegion ? get(myStatus)?.region || 0 : existing.region
      });
    } else {
      updatedPlayers.set(survivor.playerId, {
        playerId: survivor.playerId,
        state: survivor.state,
        region: survivor.sameRegion ? get(myStatus)?.region || 0 : -1,
        nextRegion: -1,
        act: 'lure',
        items: []
      });
    }
  });
  
  otherPlayers.set(updatedPlayers);
}

export function addChatMessage(message: any) {
  const newMessage = {
    ...message,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date()
  };
  chatMessages.update(messages => [...messages, newMessage]);
}

export function addRegionMessage(message: string, region: number) {
  regionMessages.update(messages => [...messages, { message, region, isErased: false }]);
}

export function eraseRegionMessage(messageIndex: number) {
  regionMessages.update(messages => {
    const newMessages = [...messages];
    if (newMessages[messageIndex]) {
      newMessages[messageIndex] = { ...newMessages[messageIndex], isErased: true };
    }
    return newMessages;
  });
}

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

// 게임 알림 표시 함수
export function showGameNotification(
  message: string, 
  type: 'info' | 'warning' | 'success' | 'danger' = 'info',
  imageUrl?: string
) {
  // type 매핑
  const messageBoxType = type === 'danger' ? 'error' : type === 'warning' ? 'alert' : type === 'info' ? 'tips' : 'success';
  
  showMessageBox(
    messageBoxType,
    type === 'danger' ? '위험!' : type === 'warning' ? '경고' : type === 'success' ? '성공' : '알림',
    message,
    undefined,
    undefined,
    imageUrl
  );
}

// 게임 상태 초기화
export function resetGameState() {
  // 타이머 정리
  stopCountdown();
  
  gameId.set('');
  gameTurn.set(1);
  turnTimer.set(60);
  gamePhase.set('waiting');
  gameResult.set(null);
  playerId.set(0);
  // myStatus는 derived store이므로 set할 수 없음
  otherPlayers.set(new Map());
  chatMessages.set([]);
  regionMessages.set([]);
  wirelessConnections.set([]);
  isHost.set(false);
  zombies.set([]);
  canInfect.set(true);
  infectTarget.set(null);
  itemUseHistory.set([]);
}

// 서버와 동기화를 위한 함수
export function syncWithServer(serverData: any) {
  if (serverData.myStatus) updateMyStatus(serverData.myStatus);
  if (serverData.survivorList) updateOtherPlayers(serverData.survivorList);
  if (serverData.gameTurn) gameTurn.set(serverData.gameTurn);
  if (serverData.count) {
    turnTimer.set(serverData.count);
  }
  if (serverData.useRegionsNumber) totalRegions.set(serverData.useRegionsNumber);
  if (serverData.hostAct && get(isHost)) {
    canInfect.set(serverData.hostAct.canUseInfect);
    updateZombieInfo(serverData.hostAct.zombieList);
  }
  if (serverData.region) {
    chatMessages.set(serverData.region.chatLog || []);
    regionMessages.set(serverData.region.regionMessageList || []);
  }
  if (serverData.alarm) {
    showGameNotification(
      serverData.alarm.message,
      'warning',
      serverData.alarm.img
    );
  }
  updateGameState(serverData);
}

// === 카운트다운 로직 (playerStore에서 이동) ===
let countdownInterval: number | null = null;

// turnTimer 값 변경 감지하여 자동으로 카운트다운 시작/중지
turnTimer.subscribe(value => {
  if (value > 0 && !countdownInterval) {
    // 타이머가 0보다 크고 카운트다운이 실행중이 아니면 시작
    countdownInterval = setInterval(() => {
      const currentCount = get(turnTimer);
      if (currentCount > 0) {
        turnTimer.set(currentCount - 1);
      } else {
        // 0이 되면 카운트다운 중지
        stopCountdown();
      }
    }, 1000);
  } else if (value === 0) {
    // 0이 되면 카운트다운 중지
    stopCountdown();
  }
});

export function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

// 게임 시작 시 카운트다운 시작
export function startGame() {
  gamePhase.set('playing');
}