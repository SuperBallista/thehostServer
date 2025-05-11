import { get } from "svelte/store";
import { showMessageBox } from "../messagebox/customStore";
import { selectPlayerMessageBox } from "../selectPlayerMessageBox/selectPlayerMessageBox";
import { nowItemList, nowRegionInfo } from "../store/tutorialStore";

let infect = true

type UseMethod = (target: any) => void;

export class Item {
  code: string;          // 아이템 코드 (ex: 'spray001')
  name: string;          // 아이템 명칭 (ex: '낙서 스프레이')
  tooltip: string;       // 아이템 설명 (ex: '다른 플레이어도 볼 수 있는 낙서를 남깁니다')
  useMethod: UseMethod;  // 아이템 사용 메서드

  constructor(code: string, name: string, tooltip: string, useMethod: UseMethod) {
    this.code = code;
    this.name = name;
    this.tooltip = tooltip;
    this.useMethod = useMethod;
  }

  use(target: any): void {
    if (typeof this.useMethod === 'function') {
      this.useMethod(target);
      nowItemList.update(list => list.filter(item => item.code!==this.code))            
    } else {
      console.warn(`아이템 [${this.name}]에는 사용 메서드가 정의되어 있지 않습니다.`);
    }
  }
}

export const spray = new Item('spray','낙서스프레이','구역에 낙서를 남겨 다음 턴부터 다른 생존자가 읽을 수 있습니다', useSpray)
export const virusChecker = new Item('virusChecker', '진단키트', '자신이 바이러스에 감염되었는지 확인합니다. 잠복기가 지나 좀비로 변이되면 사용할 수 없습니다', useVirusChecker)
export const vaccine = new Item('vaccine', '백신', '생존자 중에 섞여있는 좀비 숙주에게 이 아이템을 사용하면 승리합니다', useVaccine)
export const medicine = new Item('medicine', '응급치료제', '자신이 감염되어 잠복기 상태일 때 감염을 치료할 수 있습니다', useMedicine)
export const vaccineMaterialA = new Item('vaccineMaterialA', '항바이러스혈청', '백신을 만드는 재료입니다. 항바이러스혈청, 촉매정제물질, 신경억제단백질을 모두 모으면 백신을 만들 수 있습니다', useMakeVaccine)
export const vaccineMaterialB = new Item('vaccineMaterialB', '촉매정제물질', '백신을 만드는 재료입니다. 항바이러스혈청, 촉매정제물질, 신경억제단백질을 모두 모으면 백신을 만들 수 있습니다', useMakeVaccine)
export const vaccineMaterialC = new Item('vaccineMaterialC', '신경억제단백질', '백신을 만드는 재료입니다. 항바이러스혈청, 촉매정제물질, 신경억제단백질을 모두 모으면 백신을 만들 수 있습니다', useMakeVaccine)
export const wireless = new Item('wireless', '무전기', '구역 바깥에 있는 생존자 1명에게 귓속말 메세지를 보낼 수 있습니다', useWireless)
export const eraser = new Item('eraser', '지우개', '낙서스프레이로 남긴 메세지를 읽지 못하게 흔적만 남기고 내용을 지워버립니다', useEraser)

async function useSpray() {
    const message = (await showMessageBox('input','아이템 사용', '낙서 스프레이로 남길 메세지를 작성해주세요', undefined, [{key: 'content', label: '', type: 'text', placeholder: '여기에 이 구역에 남길 메세지를 입력'}])).values?.content
    
    if (message){
    nowRegionInfo.update(list => [message, ...list])
}
}

async function useVirusChecker() {
    if (infect) {
        showMessageBox('alert', '진단키트 사용 결과', '당신은 감염된 상태입니다(양성)')
      }
      else {
        showMessageBox('alert', '진단키트 사용 결과', '당신은 감염된 상태가 아닙니다(음성)')
      }
    
}

async function useVaccine() {
    const selectPlayer = await selectPlayerMessageBox('아이템 사용', '아이템을 사용할 대상를 선택합니다', )

    if (selectPlayer){
        if (selectPlayer.name==='엿듣는호랑이'){
           const userResponse = await showMessageBox('confirm','백신 사용','숙주는 엿듣는호랑이 였습니다. 당신은 숙주를 치료하고 생존에 성공했습니다! 확인을 누르면 본 페이지로 이동하고, 취소를 누를 경우 튜토리얼을 다시 합니다.')

           if (userResponse.success){
            window.location.href = 'https://localhost:3000'
          } else {
            location.reload();
          }

        } else{
          const userResponse = await showMessageBox('confirm', '백신 사용', '백신의 반응이 없습니다. 당신은 생존했지만 숙주가 누구인지 계속 찾아 치료해야합니다. 확인을 누르면 본 페이지로 이동하고, 취소를 누를 경우 튜토리얼을 다시 합니다.')

          if (userResponse.success){
            window.location.href = 'https://localhost:3000'
          } else {
            location.reload();
          }
        }

    }
}

 async function useMedicine() {
    infect = false
    showMessageBox('alert', '응급치료제 사용', '응급치료제를 복용해 바이러스를 치료합니다')    
 }

 async function useMakeVaccine() {
    const items = get(nowItemList);
  
    const hasAllMaterials =
      items.includes(vaccineMaterialA) &&
      items.includes(vaccineMaterialB) &&
      items.includes(vaccineMaterialC);
  
    if (hasAllMaterials) {
      nowItemList.update(items => {
        const updated = items.filter(item =>
          item !== vaccineMaterialA &&
          item !== vaccineMaterialB &&
          item !== vaccineMaterialC
        );
        updated.push(vaccine);
        return updated;
      });
  
      showMessageBox('success', '백신 조합 성공', '당신은 재료를 바탕으로 백신을 만들었습니다');
    } else {
      showMessageBox('error', '백신 조합 실패', '당신은 백신 재료가 부족합니다 신경억제단백질, 촉매정제물질, 항바이러스혈청이 모두 필요합니다');
    }
  }
  

async function useWireless() {
    
}


async function useEraser() {
    
}