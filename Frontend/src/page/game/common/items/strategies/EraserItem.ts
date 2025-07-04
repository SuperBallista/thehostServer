import { get } from 'svelte/store';
import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { selectGraffitiMessageBox } from '../../../../../common/store/selectGraffitiMessageBox';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import { regionMessages } from '../../../../../common/store/gameStateStore';
import { playerRegion } from '../../../../../common/store/playerStore';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class EraserItem extends BaseItemStrategy {
  name = '지우개';
  info = '이 구역에 남겨진 낙서를 지울 수 있습니다';
  code: ItemInterface = 'eraser';
  
  async use(): Promise<boolean> {
    const allMessages = get(regionMessages);
    const currentRegion = get(playerRegion);
    
    // 현재 지역의 메시지만 필터링 (지워지지 않은 것만)
    const currentRegionMessages = allMessages
      .filter(msg => msg.region === currentRegion && !msg.isErased)
      .map((msg, index) => ({ text: msg.message, index }));

    if (currentRegionMessages.length === 0) {
      await showMessageBox(
        'error',
        '지우개 사용 불가',
        '이 구역에 지울 수 있는 낙서가 없습니다.'
      );
      return false;
    }

    // 메시지 배열을 문자열 배열로 변환
    const availableMessages = currentRegionMessages.map(msg => msg.text);

    const selectedGraffiti = await selectGraffitiMessageBox(
      '낙서 지우기',
      '지울 낙서를 선택하세요.',
      availableMessages,
      '/img/items/eraser.jpg'
    );

    if (selectedGraffiti === null || selectedGraffiti === undefined) {
      return false;
    }

    // 선택된 메시지의 원래 인덱스 찾기
    const originalMessageIndex = allMessages.findIndex(msg => 
      msg.region === currentRegion && 
      !msg.isErased && 
      msg.message === availableMessages[selectedGraffiti]
    );

    if (originalMessageIndex === -1) {
      console.error('선택한 메시지를 찾을 수 없습니다');
      return false;
    }

    return await ItemService.sendUseItemRequest(this.code, undefined, undefined, originalMessageIndex);
  }
}