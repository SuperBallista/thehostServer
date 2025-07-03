import { get } from 'svelte/store';
import { socketStore } from '../../../common/store/socketStore';
import { authStore } from '../../../common/store/authStore';
import { showMessageBox } from '../../../common/messagebox/customStore';
import type { userRequest, ItemInterface } from '../../../common/store/synchronize.type';
import { playersInMyRegion, canInfect, zombies } from '../../../common/store/gameStateStore';
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

