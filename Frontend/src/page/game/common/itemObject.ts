import { selectPlayerMessageBox } from "../../../common/store/selectPlayerMessageBox";
import { showMessageBox } from "../../../common/messagebox/customStore";
import type { ItemInterface } from "../../../common/store/synchronize.type";
import { get } from 'svelte/store';
import { socketStore } from '../../../common/store/socketStore';
import { authStore } from '../../../common/store/authStore';
import { currentRoom } from '../../../common/store/pageStore';
import type { userRequest } from '../../../common/store/synchronize.type';
import { otherPlayers, myStatus } from '../../../common/store/gameStateStore';
import { playerId } from '../../../common/store/playerStore';
import { nicknameList } from '../game.type';
import { Survivor } from '../game.type';

type UseMethod = () => Promise<boolean>;

export const itemList = {
  spray: {
    name: '낙서스프레이',
    info: '구역에 낙서를 남겨 다음 턴부터 다른 생존자가 읽을 수 있습니다',
    method: useSpray,
  },
  virusChecker: {
    name: '진단키트',
    info: '자신이 바이러스에 감염되었는지 확인합니다. 잠복기가 지나 좀비로 변이되면 사용할 수 없습니다',
    method: useVirusChecker,
  },
  vaccine: {
    name: '백신',
    info: '생존자 중에 섞여있는 좀비 숙주에게 이 아이템을 사용하면 승리합니다',
    method: useVaccine,
  },
  medicine: {
    name: '응급치료제',
    info: '자신이 감염되어 잠복기 상태일 때 감염을 치료할 수 있습니다',
    method: useMedicine,
  },
  vaccineMaterialA: {
    name: '항바이러스혈청',
    info: '백신을 만드는 재료입니다. 항바이러스혈청, 촉매정제물질, 신경억제단백질을 모두 모으면 백신을 만들 수 있습니다',
    method: useMakeVaccine,
  },
  vaccineMaterialB: {
    name: '촉매정제물질',
    info: '백신을 만드는 재료입니다. 항바이러스혈청, 촉매정제물질, 신경억제단백질을 모두 모으면 백신을 만들 수 있습니다',
    method: useMakeVaccine,
  },
  vaccineMaterialC: {
    name: '신경억제단백질',
    info: '백신을 만드는 재료입니다. 항바이러스혈청, 촉매정제물질, 신경억제단백질을 모두 모으면 백신을 만들 수 있습니다',
    method: useMakeVaccine,
  },
  wireless: {
    name: '무전기',
    info: '구역 바깥에 있는 생존자 1명에게 귓속말 메세지를 보낼 수 있습니다',
    method: useWireless,
  },
  eraser: {
    name: '지우개',
    info: '낙서스프레이로 남긴 메세지를 읽지 못하게 흔적만 남기고 내용을 지워버립니다',
    method: useEraser,
  },
  shotgun: {
    name: '좀비사살용산탄총',
    info: '좀비를 즉사시킬 수 있는 산탄총입니다',
    method: useShotgun,
  },
  microphone: {
    name: '마이크',
    info: '섬 전체에 한번 메세지를 전송할 수 있는 무선 마이크입니다',
    method: useMicrophone,
  }
};

export class Item {
  code: string;          // 아이템 코드 (ex: 'spray001')
  name: string;          // 아이템 명칭 (ex: '낙서 스프레이')
  tooltip: string;       // 아이템 설명 (ex: '다른 플레이어도 볼 수 있는 낙서를 남깁니다')
  useMethod: UseMethod;  // 아이템 사용 메서드

  constructor(code: ItemInterface) {
    this.code = code;
    this.name = itemList[code].name;
    this.tooltip = itemList[code].info;
    this.useMethod = itemList[code].method;
  }

  async giveItem(): Promise<void> {
    const userResponse = await selectPlayerMessageBox('아이템 주기', '누구에게 아이템을 주겠습니까?', [], `img/items/${this.code}.jpg`)

    if (userResponse) {
        showMessageBox('alert','아이템 건네주기',`${userResponse.nickname}에게 ${this.name}을(를) 건네주었습니다`)
  }}

  async use(): Promise<void> {
    if (typeof this.useMethod === 'function') {
     const success = await this.useMethod();
     if (success) {

     }            
    } else {

    }
  }
}

// 서버에 아이템 사용 요청을 보내는 공통 함수
async function sendUseItemRequest(item: ItemInterface, targetPlayer?: number, content?: string, targetMessage?: number): Promise<boolean> {
  const socket = get(socketStore);
  const authData = get(authStore);
  const room = get(currentRoom);
  const currentPlayerId = get(playerId);
  
  if (!socket || !authData.token || !authData.user || !room?.id) {
    console.error('소켓 또는 인증 정보가 없습니다');
    return false;
  }

  const requestData: userRequest = {
    token: authData.token,
    user: authData.user,
    useItem: {
      item,
      targetPlayer,
      content,
      targetMessage,
      playerId: currentPlayerId
    },
    roomId: room.id
  };

  socket.emit('request', requestData);
  console.log('아이템 사용 요청 전송:', requestData);
  return true;
}

async function useSpray(): Promise<boolean> {
  const message = (await showMessageBox(
    'input',
    '낙서스프레이 사용',
    '구역에 남길 낙서 메시지를 작성해주세요',
    undefined,
    [
      {
        key: 'content',
        label: '',
        type: 'text',
        placeholder: '여기에 이 구역에 남길 메시지를 입력하세요'
      }
    ],
    '/img/items/spray.jpg'
  )).values?.content;

  if (message && message.trim()) {
    return await sendUseItemRequest('spray', undefined, message.trim());
  }
  return false;
}

async function useVirusChecker(): Promise<boolean> {
  // 사용 확인 메시지
  const result = await showMessageBox(
    'confirm',
    '진단키트 사용',
    '진단키트를 사용하여 감염 여부를 확인하시겠습니까?\n\n결과는 본인에게만 표시됩니다.',
    undefined,
    undefined,
    '/img/items/virusChecker.jpg'
  );

  if (result) {
    return await sendUseItemRequest('virusChecker');
  }
  return false;
}

async function useVaccine(): Promise<boolean> {
  return await sendUseItemRequest('vaccine');
}

async function useMedicine(): Promise<boolean> {
  return await sendUseItemRequest('medicine');
}

async function useMakeVaccine(): Promise<boolean> {
  // 백신 재료는 조합용이므로 사용 불가
  await showMessageBox('alert', '알림', '백신 재료는 조합해서 사용해야 합니다.');
  return false;
}

async function useWireless(): Promise<boolean> {
  // 다른 지역에 있는 생존자들 중에서 선택 (무전기는 다른 지역에 있는 플레이어에게 보냄)
  const allSurvivors = get(otherPlayers);
  const myRegion = get(myStatus)?.region || 0;
  
  // 다른 지역에 있는 생존자들만 필터링
  const playersInOtherRegions = Array.from(allSurvivors.values())
    .filter(player => player.region !== myRegion && player.state === 'alive')
    .map(player => new Survivor(
      player.playerId,
      player.state,
      false // sameRegion = false (다른 지역에 있음)
    ));

  if (playersInOtherRegions.length === 0) {
    await showMessageBox(
      'error',
      '무전기 사용 불가',
      '다른 지역에 있는 생존자가 없습니다.'
    );
    return false;
  }

  const selectedPlayer = await selectPlayerMessageBox(
    '무전기 사용',
    '무전을 보낼 생존자를 선택하세요.',
    playersInOtherRegions,
    '/img/items/wireless.jpg'
  );

  if (!selectedPlayer) return false;

  const message = (await showMessageBox(
    'input',
    '무전 메시지',
    '무전으로 보낼 메시지를 입력하세요',
    undefined,
    [
      {
        key: 'content',
        label: '',
        type: 'text',
        placeholder: '무전 메시지를 입력하세요'
      }
    ],
    '/img/items/wireless.jpg'
  )).values?.content;

  if (message && message.trim()) {
    return await sendUseItemRequest('wireless', selectedPlayer.playerId, message.trim());
  }
  return false;
}

async function useEraser(): Promise<boolean> {
  // 구역의 낙서 목록을 보여주고 선택하도록 함
  // 실제로는 구역 정보를 가져와서 낙서 목록을 표시해야 함
  await showMessageBox('alert', '알림', '지우개 기능은 준비 중입니다.');
  return false;
}

async function useShotgun(): Promise<boolean> {
  // 같은 지역에 있는 좀비들 중에서 선택
  const playersInRegion = await selectPlayerMessageBox(
    '산탄총 사용',
    '사살할 좀비를 선택하세요.',
    [],
    '/img/items/shotgun.jpg'
  );

  if (playersInRegion) {
    return await sendUseItemRequest('shotgun', playersInRegion.playerId);
  }
  return false;
}

async function useMicrophone(): Promise<boolean> {
  const message = (await showMessageBox(
    'input',
    '마이크 사용',
    '전체 방송할 메시지를 입력하세요',
    undefined,
    [
      {
        key: 'content',
        label: '',
        type: 'text',
        placeholder: '방송할 메시지를 입력하세요'
      }
    ],
    '/img/items/microphone.jpg'
  )).values?.content;

  if (message && message.trim()) {
    return await sendUseItemRequest('microphone', undefined, message.trim());
  }
  return false;
}
