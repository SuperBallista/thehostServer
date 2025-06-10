import { selectPlayerMessageBox } from "../selectModal/selectPlayerMessageBox";
import { showMessageBox } from "../../../common/messagebox/customStore";
import type { ItemInterface } from "../../../common/store/synchronize.type";



type UseMethod = () => Promise<boolean>;

const itemList = {
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
};


export class  Item {
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


async function useSpray() {
    const message = (await showMessageBox('input','아이템 사용', '낙서 스프레이로 남길 메세지를 작성해주세요', undefined, [{key: 'content', label: '', type: 'text', placeholder: '여기에 이 구역에 남길 메세지를 입력'}], 'img/items/spray.jpg')).values?.content
    if (message){
    return true
} else return false
}

async function useVirusChecker() {

    return true    
}

async function useVaccine() {

    return true    
}

 async function useMedicine() {
    return true
 }

async function useMakeVaccine(): Promise<boolean> {

  return true;
}
  

async function useWireless() {
  return true
}


async function useEraser() {
return false;
}