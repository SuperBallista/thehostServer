import { writable, derived, get } from 'svelte/store';
import type { 
  GamePlayerStatusInterface, 
  SurvivorInterface,
  ItemInterface,
  MyPlayerState,
  OtherPlayerState
} from './synchronize.type';
import { 
  playerId, 
  playerState, 
  playerRegion, 
  playerNextRegion, 
  playerAct, 
  playerItems,
  playerCanEscape 
} from './playerStore';
import { 
  chatMessages, 
  regionMessages, 
  wirelessConnections,
  addChatMessage,
  addRegionMessage,
  eraseRegionMessage,
  resetChatState
} from './chatStore';
import {
  isHost,
  zombies,
  canInfect,
  infectTarget,
  updateZombieInfo,
  resetHostState
} from './hostStore';
import {
  itemUseHistory,
  addItemUseRecord,
  resetItemHistory
} from './itemHistoryStore';

// 게임 기본 정보
export const gameId = writable<string>('');
export const gameTurn = writable<number>(1);
export const turnTimer = writable<number>(60); // 기본값을 60초로 설정
export const gamePhase = writable<'waiting' | 'playing' | 'ended'>('waiting');
export const gameResult = writable<'infected' | 'killed' | 'cure' | null>(null);

// 지역 관련
export const totalRegions = writable<number>(6);
export const regionNames = writable<string[]>([
  '해안', '폐건물', '정글', '동굴', '산 정상', '개울'
]);

// 다른 플레이어들의 상태
export interface PlayerStatus {
  playerId: number;
  state: OtherPlayerState; // 다른 플레이어들의 상태 (모든 상태 가능)
  region: number;
  nextRegion: number;
  act: 'runaway' | 'hide' | 'lure';
  items: ItemInterface[];
  infectedTurn?: number;
}

// 내 상태 (MyPlayerState만 가능)
export interface MyPlayerStatus {
  playerId: number;
  state: MyPlayerState; // 내 상태는 alive 또는 host만 가능
  region: number;
  nextRegion: number;
  act: 'runaway' | 'hide' | 'lure';
  items: ItemInterface[];
  canEscape?: boolean; // 도주 가능 여부
}

// myStatus를 playerStore의 값들을 합쳐서 파생 스토어로 제공
export const myStatus = derived(
  [playerId, playerState, playerRegion, playerNextRegion, playerAct, playerItems, playerCanEscape],
  ([$playerId, $state, $region, $nextRegion, $act, $items, $canEscape]) => {
    if ($playerId === undefined) return null;
    
    // MyPlayerState 타입으로 안전하게 변환
    const safeState: MyPlayerState = $state === 'host' ? 'host' : 'alive';
    
    return {
      playerId: $playerId,
      nickname: '', // 서버에서 받아야 함
      state: safeState,
      region: $region,
      nextRegion: $nextRegion,
      act: $act,
      items: $items,
      canEscape: $canEscape
    } as MyPlayerStatus;
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

// 같은 구역에 좀비가 있는지 확인 (파생 스토어)
export const hasZombieInMyRegion = derived(
  playersInMyRegion,
  $playersInMyRegion => {
    return $playersInMyRegion.some(player => player.state === 'zombie');
  }
);

// Re-export from specialized stores for backward compatibility
export { chatMessages, regionMessages, wirelessConnections, type WirelessConnection, type MicrophoneMessage } from './chatStore';

// Re-export from hostStore for backward compatibility
export { isHost, zombies, canInfect, infectTarget, type ZombieInfo } from './hostStore';

// Re-export from itemHistoryStore for backward compatibility
export { itemUseHistory, type ItemUseRecord } from './itemHistoryStore';

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
  if (status.state !== undefined) {
    playerState.set(status.state);
    // 'host' 상태일 때 isHost 설정
    if (status.state === 'host') {
      isHost.set(true);
    }
  }
  if (status.region !== undefined) playerRegion.set(status.region);
  if (status.nextRegion !== undefined) playerNextRegion.set(status.nextRegion);
  if (status.act !== undefined) playerAct.set(status.act);
  if (status.items !== undefined) playerItems.set(status.items);
  if (status.canEscape !== undefined) playerCanEscape.set(status.canEscape);
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

// Re-export functions from specialized stores for backward compatibility
export { addChatMessage, addRegionMessage, eraseRegionMessage } from './chatStore';
export { updateZombieInfo } from './hostStore';

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
  resetChatState();
  resetHostState();
  resetItemHistory();
}

// 서버와 동기화를 위한 함수
export function syncWithServer(serverData: any) {
  // 게임 시작 응답인 경우 채팅 초기화 (locationState가 'game'이고 gameTurn이 1인 경우)
  if (serverData.locationState === 'game' && serverData.gameTurn === 1) {
    chatMessages.set([]);
    regionMessages.set([]);
  }
  
  // myStatus를 먼저 업데이트하여 isHost가 설정되도록 함
  if (serverData.myStatus) updateMyStatus(serverData.myStatus);
  if (serverData.survivorList) updateOtherPlayers(serverData.survivorList);
  if (serverData.gameTurn) gameTurn.set(serverData.gameTurn);
  if (serverData.count) {
    turnTimer.set(serverData.count);
  }
  if (serverData.useRegionsNumber) totalRegions.set(serverData.useRegionsNumber);
  
  // isHost가 설정된 후에 hostAct 처리
  if (serverData.hostAct) {
    // 현재 플레이어가 숙주이거나, myStatus.state가 'host'인 경우
    const currentIsHost = get(isHost) || (serverData.myStatus?.state === 'host');
    console.log('Host Act 처리:', {
      hostAct: serverData.hostAct,
      currentIsHost,
      isHostValue: get(isHost),
      myStatusState: serverData.myStatus?.state
    });
    if (currentIsHost) {
      canInfect.set(serverData.hostAct.canInfect);  // canUseInfect를 canInfect로 변경
      updateZombieInfo(serverData.hostAct.zombieList);
      console.log('canInfect 설정됨:', serverData.hostAct.canInfect);
    }
  }
  if (serverData.region) {
    // 채팅 메시지는 추가하는 방식으로 변경
    if (serverData.region.chatLog && serverData.region.chatLog.length > 0) {
      console.log('채팅 메시지 수신:', serverData.region.chatLog);
      chatMessages.update(messages => [...messages, ...serverData.region.chatLog]);
    }
    // 지역 메시지는 현재 구역의 메시지만 업데이트
    if (serverData.region.regionMessageList !== undefined) {
      const currentRegion = get(myStatus)?.region || 0;
      const currentRegionMessages = serverData.region.regionMessageList.map((msg: string | null, index: number) => ({
        message: msg || '',
        region: currentRegion,
        isErased: msg === null
      }));
      
      // 현재 구역의 기존 메시지 제거 후 새로운 메시지 추가
      regionMessages.update(messages => {
        const otherRegionMessages = messages.filter(msg => msg.region !== currentRegion);
        return [...otherRegionMessages, ...currentRegionMessages];
      });
      
      console.log('구역 메시지 업데이트:', {
        region: currentRegion,
        messages: currentRegionMessages
      });
    }
  }
  
  // 무전기 메시지 처리 (direct chatMessage)
  if (serverData.chatMessage) {
    console.log('무전기 메시지 수신:', serverData.chatMessage);
    chatMessages.update(messages => [...messages, serverData.chatMessage]);
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