import { get } from 'svelte/store';
import { socketStore } from '../../../common/store/socketStore';
import { authStore } from '../../../common/store/authStore';
import { showMessageBox } from '../../../common/messagebox/customStore';
import type { userRequest, ItemInterface } from '../../../common/store/synchronize.type';
import { playersInMyRegion, canInfect, zombies, myStatus, hasZombieInMyRegion, otherPlayers, regionNames, type ZombieInfo } from '../../../common/store/gameStateStore';
import { showSelectOptionBox } from '../../../common/store/selectOptionStore';
import { selectPlayerMessageBox } from '../../../common/store/selectPlayerMessageBox';
import { nicknameList, Survivor } from '../game.type';
import { currentRoom } from '../../../common/store/pageStore';
import { itemList } from './itemObject';

/**
 * 게임 나가기 처리
 */
export async function exitGame() {
  const response = await showMessageBox(
    'confirm',
    '게임 나가기',
    '정말로 게임을 나가시겠습니까?\n게임을 나가면 다시 참여할 수 없습니다.'
  );

  if (!response.success) return;

  const socket = get(socketStore);
  const authData = get(authStore);
  
  if (!socket || !authData.token || !authData.user) {
    console.error('소켓 또는 인증 정보가 없습니다');
    return;
  }
  
  const requestData: userRequest = {
    token: authData.token,
    user: authData.user,
    exitRoom: true
  };
  
  socket.emit('request', requestData);
  console.log('게임 나가기 요청 전송');
}

/**
 * 아이템 전달하기
 */
export async function giveItem(item: ItemInterface) {
  // 같은 지역에 있는 생존자들만 필터링
  const playersInRegion = get(playersInMyRegion);
  
  if (!playersInRegion || playersInRegion.length === 0) {
    await showMessageBox(
      'error',
      '알림',
      '같은 지역에 다른 생존자가 없습니다.'
    );
    return;
  }

  // PlayerStatus를 Survivor 클래스 인스턴스로 변환
  const survivors: Survivor[] = playersInRegion.map(player => {
    const survivor = new Survivor(
      player.playerId,
      player.state === 'host' ? 'alive' : player.state, // host만 alive로 표시 (infected 상태는 없음)
      true // sameRegion
    );
    return survivor;
  });

  try {
    // 플레이어 선택 모달 표시
    const selectedPlayer = await selectPlayerMessageBox(
      '아이템 전달',
      `${itemList[item].name}을(를) 전달할 생존자를 선택하세요.`,
      survivors,
      `/img/items/${item}.jpg`
    );

    if (selectedPlayer) {
      // 서버로 아이템 전달 요청
      const socket = get(socketStore);
      const token = get(authStore).token;
      const user = get(authStore).user;
      const room = get(currentRoom);

      if (!socket || !token || !user || !room?.id) return;

      console.log('아이템 전달:', { 
        item, 
        targetPlayer: selectedPlayer.playerId,
        targetNickname: selectedPlayer.nickname 
      });
      
      const requestData: userRequest = {
        token,
        user,
        giveItem: {
          item: item,
          receiver: selectedPlayer.playerId
        },
        roomId: room.id
      };

      socket.emit('request', requestData);
      console.log('서버로 아이템 전달 요청:', requestData);
    }
  } catch (error) {
    // 사용자가 취소한 경우
    console.log('아이템 전달 취소');
  }
}

/**
 * 숙주가 플레이어를 감염시키기
 */
export async function infectPlayer() {
  // 현재 감염 가능 여부 확인
  const currentCanInfect = get(canInfect);
  if (!currentCanInfect) {
    await showMessageBox(
      'error',
      '알림',
      '이번 턴에는 감염시킬 수 없습니다.'
    );
    return;
  }

  // 같은 지역에 있는 생존자들만 필터링
  const playersInRegion = get(playersInMyRegion);
  
  if (!playersInRegion || playersInRegion.length === 0) {
    await showMessageBox(
      'error',
      '알림',
      '같은 지역에 다른 생존자가 없습니다.'
    );
    return;
  }

  // PlayerStatus를 Survivor 클래스 인스턴스로 변환 (alive인 사람만 필터링)
  const survivors: Survivor[] = playersInRegion
    .filter(player => player.state === 'alive' || player.state === 'host') // alive와 host만 감염 가능
    .map(player => {
      const survivor = new Survivor(
        player.playerId,
        player.state === 'host' ? 'alive' : player.state, // host는 alive로 표시
        true // sameRegion
      );
      // nickname은 constructor에서 nicknameList를 사용해서 자동 설정됨
      return survivor;
    });
  
  if (survivors.length === 0) {
    await showMessageBox(
      'error',
      '알림',
      '감염시킬 수 있는 생존자가 없습니다.'
    );
    return;
  }

  try {
    // 플레이어 선택 모달 표시
    const selectedPlayer = await selectPlayerMessageBox(
      '감염 대상 선택',
      '좀비 바이러스를 감염시킬 생존자를 선택하세요.',
      survivors,
      '/img/scence/infect.png'
    );

    if (selectedPlayer) {
      // 서버로 감염 요청
      const socket = get(socketStore);
      const authData = get(authStore);
      const currentZombies = get(zombies);

      if (!socket || !authData.token || !authData.user) return;
      
      const requestData: userRequest = {
        token: authData.token,
        user: authData.user,
        hostAct: {
          infect: selectedPlayer.playerId  // 감염 대상만 전송 (canInfect는 이미 확인함)
        }
      };

      socket.emit('request', requestData);
      console.log('감염 요청 전송:', selectedPlayer.playerId);
    }
  } catch (error) {
    console.log('감염 대상 선택 취소');
  }
}

/**
 * 좀비 대처 행동 선택
 */
export async function copeWithZombie() {
  // 같은 구역에 좀비가 있는지 확인
  const hasZombie = get(hasZombieInMyRegion);
  const currentStatus = get(myStatus);
  
  if (!hasZombie) {
    await showMessageBox(
      'error',
      '알림', 
      '같은 구역에 좀비가 없습니다.'
    );
    return;
  }
  
  // 숙주도 의심을 피하기 위해 좀비 대처 행동을 선택할 수 있음
  
  // canEscape 값을 사용하여 도주 가능 여부 확인
  const canEscape = currentStatus?.canEscape ?? true;
  
  const options = [
    { value: 'hide', label: '숨기 (좀비가 쫓아올 때 죽을 수 있지만 다른 생존자의 유인 도움을 받으면 생존)' },
    { value: 'lure', label: '유인 (다른 생존자를 도울 수 있지만 좀비가 직접 쫓아올 경우 죽게 됨)' }
  ];
  
  if (canEscape) {
    options.push({ value: 'runaway', label: '도주 (아무도 돕지 않고 도망가서 무조건 생존하나 연속 선택 불가)' });
  }
  
  const result = await showSelectOptionBox(
    '좀비를 만났습니다',
    '좀비에게 어떤 행동을 하시겠습니까?',
    options
  );
  
  if (result && result.value) {
    // 선택한 행동을 서버로 전송
    const socket = get(socketStore);
    const token = get(authStore).token;
    const user = get(authStore).user;

    if (!socket || !token || !user || !currentStatus) return;

    console.log('좀비 대처 행동 선택:', result.value);

    const requestData: userRequest = {
      token,
      user,
      myStatus: {
        act: result.value as 'hide' | 'lure' | 'runaway' // 변경된 필드만 전송
      }
    };

    console.log('좀비 대처 행동 요청 전송:', {
      selectedAct: result.value,
      myStatus: requestData.myStatus,
      hasAct: 'act' in requestData.myStatus,
      hasNext: 'next' in requestData.myStatus
    });
    
    socket.emit('request', requestData);
  }
}

/**
 * 좀비 제어 (좀비 선택 후 행동 결정)
 */
export async function controlZombie() {
  const currentZombies = get(zombies);
  const allPlayers = get(otherPlayers);
  
  if (!currentZombies || currentZombies.length === 0) {
    await showMessageBox(
      'error',
      '알림',
      '제어할 좀비가 없습니다.'
    );
    return;
  }

  // 1. 먼저 제어할 좀비 선택
  const zombieSurvivors: Survivor[] = currentZombies.map(zombie => 
    new Survivor(zombie.playerId, 'zombie', false)
  );

  try {
    const selectedZombie = await selectPlayerMessageBox(
      '좀비 선택',
      '제어할 좀비를 선택하세요.',
      zombieSurvivors,
      '/img/scence/zombie.png'
    );

    if (!selectedZombie) return;

    // 선택된 좀비 정보 찾기
    const zombieInfo = currentZombies.find(z => z.playerId === selectedZombie.playerId);
    if (!zombieInfo) return;

    // 2. 행동 선택
    const turnsInfo = zombieInfo.turnsUntilMove > 0 
      ? ` (${zombieInfo.turnsUntilMove}턴 후 이동)` 
      : ' (이번 턴 이동)';
    
    const actionResult = await showSelectOptionBox(
      `${selectedZombie.nickname} 제어`,
      `어떤 행동을 하시겠습니까?${turnsInfo}`,
      [
        { value: 'attack', label: '공격 대상 설정' },
        { value: 'move', label: '이동 구역 설정' }
      ]
    );

    if (!actionResult || !actionResult.value) return;

    // 3. 선택한 행동에 따라 처리
    if (actionResult.value === 'attack') {
      await setZombieTarget(zombieInfo);
    } else if (actionResult.value === 'move') {
      await setZombieMovement(zombieInfo);
    }
  } catch (error) {
    console.log('좀비 제어 취소');
  }
}

/**
 * 특정 좀비의 공격 대상 설정
 */
async function setZombieTarget(zombie: ZombieInfo) {
  const allPlayers = get(otherPlayers);
  const currentMyStatus = get(myStatus);
  
  // 좀비와 같은 구역에 있는 생존자 목록 사용
  const survivorsInZombieRegion: Survivor[] = [];
  
  if (zombie.survivorsInRegion && zombie.survivorsInRegion.length > 0) {
    // 서버에서 제공한 생존자 ID로 생존자 정보 구성
    zombie.survivorsInRegion.forEach((survivorId: number) => {
      // otherPlayers에서 정보를 찾거나, 없으면 기본 정보 사용
      const playerInfo = allPlayers.get(survivorId);
      if (playerInfo) {
        survivorsInZombieRegion.push(
          new Survivor(survivorId, playerInfo.state, false)
        );
      } else {
        // 정보가 없으면 기본값 사용 (호스트는 다른 구역 정보를 모를 수 있음)
        survivorsInZombieRegion.push(
          new Survivor(survivorId, 'alive', false)
        );
      }
    });
  }
  
  // 호스트가 같은 구역에 있으면 직접 확인 가능
  if (currentMyStatus && zombie.region === currentMyStatus.region) {
    // 호스트와 같은 구역이면 직접 보이는 정보 사용
    survivorsInZombieRegion.length = 0; // 초기화
    allPlayers.forEach(player => {
      if (player.region === zombie.region && 
          (player.state === 'alive' || player.state === 'host')) {
        survivorsInZombieRegion.push(
          new Survivor(player.playerId, player.state, true)
        );
      }
    });
  }

  if (survivorsInZombieRegion.length === 0) {
    await showMessageBox(
      'alert',
      '알림',
      '같은 구역에 공격할 수 있는 생존자가 없습니다.'
    );
    return;
  }

  try {
    const zombieNickname = nicknameList[zombie.playerId] || `좀비 #${zombie.playerId}`;
    const targetPlayer = await selectPlayerMessageBox(
      `${zombieNickname}의 공격 대상`,
      '공격할 생존자를 선택하세요.',
      survivorsInZombieRegion,
      '/img/scence/zombie.png'
    );

    if (targetPlayer) {
      // 서버로 좀비 명령 전송
      const socket = get(socketStore);
      const authData = get(authStore);

      if (!socket || !authData.token || !authData.user) return;

      const requestData: userRequest = {
        token: authData.token,
        user: authData.user,
        hostAct: {
          zombieList: [{
            playerId: zombie.playerId,
            targetId: targetPlayer.playerId,
            nextRegion: zombie.nextRegion,
            leftTurn: zombie.turnsUntilMove,
            region: zombie.region
          }]
        }
      };

      socket.emit('request', requestData);
      console.log('좀비 공격 대상 설정:', targetPlayer.playerId);
    }
  } catch (error) {
    console.log('공격 대상 선택 취소');
  }
}

/**
 * 특정 좀비의 이동 구역 설정
 */
async function setZombieMovement(zombie: ZombieInfo) {
  const regions = get(regionNames);
  const zombieNickname = nicknameList[zombie.playerId] || `좀비 #${zombie.playerId}`;
  const currentRegionName = regions[zombie.region] || '알 수 없는 지역';
  
  // 지역 선택지 생성
  const regionOptions = regions.map((name, index) => ({
    value: index.toString(),
    label: name
  }));

  try {
    const turnsUntilMove = zombie.turnsUntilMove;
    const moveInfo = turnsUntilMove > 0 
      ? `\n${turnsUntilMove}턴 후 이동 예정` 
      : '\n이번 턴 이동 예정';
    
    const result = await showSelectOptionBox(
      `${zombieNickname}의 이동`,
      `다음 이동할 지역을 선택하세요.\n현재 위치: ${currentRegionName}${moveInfo}`,
      regionOptions
    );

    if (result && result.value) {
      const selectedRegion = parseInt(result.value);
      
      // 서버로 좀비 명령 전송
      const socket = get(socketStore);
      const authData = get(authStore);

      if (!socket || !authData.token || !authData.user) return;

      const requestData: userRequest = {
        token: authData.token,
        user: authData.user,
        hostAct: {
          zombieList: [{
            playerId: zombie.playerId,
            targetId: zombie.targetId,
            nextRegion: selectedRegion,
            leftTurn: zombie.turnsUntilMove,
            region: zombie.region
          }]
        }
      };

      socket.emit('request', requestData);
      console.log('좀비 이동 구역 설정:', selectedRegion);
    }
  } catch (error) {
    console.log('이동 구역 선택 취소');
  }
}

/**
 * 좀비의 공격 대상 설정 (전체 - 기존 함수는 남겨둠)
 */
export async function setZombieTargets() {
  const currentZombies = get(zombies);
  const allPlayers = get(otherPlayers);
  
  if (!currentZombies || currentZombies.length === 0) {
    await showMessageBox(
      'error',
      '알림',
      '제어할 좀비가 없습니다.'
    );
    return;
  }

  // 각 좀비에 대해 공격 대상 설정
  interface ZombieCommand {
    playerId: number;
    targetId: number | null;
    nextRegion: number;
    leftTurn: number;
    region: number;
  }
  const zombieCommands: ZombieCommand[] = [];
  
  for (const zombie of currentZombies) {
    // 해당 좀비와 같은 구역에 있는 생존자 찾기
    const survivorsInZombieRegion: Survivor[] = [];
    
    allPlayers.forEach(player => {
      if (player.region === zombie.region && 
          (player.state === 'alive' || player.state === 'host')) {
        survivorsInZombieRegion.push(
          new Survivor(player.playerId, player.state, true)
        );
      }
    });

    if (survivorsInZombieRegion.length === 0) {
      // 같은 구역에 생존자가 없으면 공격 대상 없음
      zombieCommands.push({
        playerId: zombie.playerId,
        targetId: null,
        next: zombie.nextRegion,
        leftTurn: zombie.turnsUntilMove,
        region: zombie.region
      });
      continue;
    }

    try {
      // 공격 대상 선택
      const zombieNickname = nicknameList[zombie.playerId] || `좀비 #${zombie.playerId}`;
      const targetPlayer = await selectPlayerMessageBox(
        `${zombieNickname}의 공격 대상`,
        `${zombieNickname}가 공격할 생존자를 선택하세요.`,
        survivorsInZombieRegion,
        '/img/scence/zombie.png'
      );

      if (targetPlayer) {
        zombieCommands.push({
          playerId: zombie.playerId,
          targetId: targetPlayer.playerId,
          nextRegion: zombie.nextRegion,
          leftTurn: zombie.turnsUntilMove,
          region: zombie.region
        });
      } else {
        // 취소한 경우 현재 상태 유지
        zombieCommands.push({
          playerId: zombie.playerId,
          targetId: zombie.targetId,
          nextRegion: zombie.nextRegion,
          leftTurn: zombie.turnsUntilMove,
          region: zombie.region
        });
      }
    } catch (error) {
      console.log('공격 대상 선택 취소');
      return; // 하나라도 취소하면 전체 취소
    }
  }

  // 서버로 좀비 명령 전송
  const socket = get(socketStore);
  const authData = get(authStore);

  if (!socket || !authData.token || !authData.user) return;

  const requestData: userRequest = {
    token: authData.token,
    user: authData.user,
    hostAct: {
      zombieList: zombieCommands
    }
  };

  socket.emit('request', requestData);
  console.log('좀비 공격 대상 설정:', zombieCommands);
}

/**
 * 좀비의 이동 구역 설정
 */
export async function setZombieMovements() {
  const currentZombies = get(zombies);
  const regions = get(regionNames);
  
  if (!currentZombies || currentZombies.length === 0) {
    await showMessageBox(
      'error',
      '알림',
      '제어할 좀비가 없습니다.'
    );
    return;
  }

  // 각 좀비에 대해 이동 구역 설정
  interface ZombieCommand {
    playerId: number;
    targetId: number | null;
    nextRegion: number;
    leftTurn: number;
    region: number;
  }
  const zombieCommands: ZombieCommand[] = [];
  
  for (const zombie of currentZombies) {
    const zombieNickname = nicknameList[zombie.playerId] || `좀비 #${zombie.playerId}`;
    const currentRegionName = regions[zombie.region] || '알 수 없는 지역';
    
    // 지역 선택지 생성
    const regionOptions = regions.map((name, index) => ({
      value: index.toString(),
      label: name
    }));

    try {
      const result = await showSelectOptionBox(
        `${zombieNickname}의 이동`,
        `${zombieNickname}가 다음 턴에 이동할 지역을 선택하세요.\n현재 위치: ${currentRegionName}`,
        regionOptions
      );

      if (result && result.value) {
        const selectedRegion = parseInt(result.value);
        zombieCommands.push({
          playerId: zombie.playerId,
          targetId: zombie.targetId,
          nextRegion: selectedRegion,
          leftTurn: zombie.turnsUntilMove,
          region: zombie.region
        });
      } else {
        // 취소한 경우 현재 상태 유지
        zombieCommands.push({
          playerId: zombie.playerId,
          targetId: zombie.targetId,
          nextRegion: zombie.nextRegion,
          leftTurn: zombie.turnsUntilMove,
          region: zombie.region
        });
      }
    } catch (error) {
      console.log('이동 구역 선택 취소');
      return; // 하나라도 취소하면 전체 취소
    }
  }

  // 서버로 좀비 명령 전송
  const socket = get(socketStore);
  const authData = get(authStore);

  if (!socket || !authData.token || !authData.user) return;

  const requestData: userRequest = {
    token: authData.token,
    user: authData.user,
    hostAct: {
      zombieList: zombieCommands
    }
  };

  socket.emit('request', requestData);
  console.log('좀비 이동 구역 설정:', zombieCommands);
}

