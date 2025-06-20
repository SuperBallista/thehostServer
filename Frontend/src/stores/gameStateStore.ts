import { writable, derived, get } from 'svelte/store';
import type { 
  GamePlayerStatusInterface, 
  SurvivorInterface,
  ItemInterface 
} from '../common/store/synchronize.type';

// 게임 기본 정보
export const gameId = writable<string>('');
export const gameTurn = writable<number>(1);
export const turnTimer = writable<number>(90);
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
  nickname: string;
  state: 'alive' | 'host' | 'zombie' | 'dead' | 'infected' | 'you';
  region: number;
  nextRegion: number;
  act: 'runaway' | 'hide' | 'lure';
  items: ItemInterface[];
  infectedTurn?: number;
}

export const myPlayerId = writable<number>(0);
export const myStatus = writable<PlayerStatus | null>(null);

// 다른 플레이어들 상태
export const otherPlayers = writable<Map<number, PlayerStatus>>(new Map());

// 같은 구역 플레이어 (파생 스토어)
export const playersInMyRegion = derived(
  [myStatus, otherPlayers],
  ([$myStatus, $otherPlayers]) => {
    if (!$myStatus) return [];
    
    const players: PlayerStatus[] = [];
    $otherPlayers.forEach(player => {
      if (player.region === $myStatus.region && player.state !== 'dead') {
        players.push(player);
      }
    });
    return players;
  }
);

// 채팅 & 메시지
export interface ChatMessage {
  id: string;
  playerId?: number;
  nickname?: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'system' | 'whisper' | 'broadcast';
  region?: number;
}

export interface RegionMessage {
  id: string;
  message: string;
  region: number;
  turn: number;
  isErased: boolean;
}

export const chatMessages = writable<ChatMessage[]>([]);
export const regionMessages = writable<RegionMessage[]>([]);

// 무전기 연결
export interface WirelessConnection {
  fromPlayerId: number;
  toPlayerId: number;
  active: boolean;
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
import { showMessageBox } from '../common/messagebox/customStore';

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
  const currentStatus = get(myStatus);
  if (currentStatus) {
    myStatus.set({
      ...currentStatus,
      state: status.state,
      region: status.region,
      nextRegion: status.next,
      act: status.act,
      items: status.items
    });
  }
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
        nickname: survivor.nickname,
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

export function addChatMessage(message: Omit<ChatMessage, 'id'>) {
  const newMessage: ChatMessage = {
    ...message,
    id: `${Date.now()}-${Math.random()}`
  };
  chatMessages.update(messages => [...messages, newMessage]);
}

export function addRegionMessage(message: string, region: number) {
  const newMessage: RegionMessage = {
    id: `${Date.now()}-${Math.random()}`,
    message,
    region,
    turn: get(gameTurn),
    isErased: false
  };
  regionMessages.update(messages => [...messages, newMessage]);
}

export function eraseRegionMessage(messageId: string) {
  regionMessages.update(messages => 
    messages.map(msg => 
      msg.id === messageId ? { ...msg, isErased: true } : msg
    )
  );
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
  gameId.set('');
  gameTurn.set(1);
  turnTimer.set(90);
  gamePhase.set('waiting');
  gameResult.set(null);
  myPlayerId.set(0);
  myStatus.set(null);
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
  if (serverData.count) turnTimer.set(serverData.count);
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