import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class SprayItem extends BaseItemStrategy {
  name = '낙서스프레이';
  info = '구역에 낙서를 남겨 다음 턴부터 다른 생존자가 읽을 수 있습니다';
  code: ItemInterface = 'spray';
  
  async use(): Promise<boolean> {
    const response = await showMessageBox(
      'input',
      '낙서 남기기',
      '이 구역에 남길 메시지를 입력하세요.',
      undefined,
      [
        {
          key: 'content',
          label: '',
          type: 'text',
          placeholder: '낙서 내용을 입력하세요'
        }
      ],
      '/img/items/spray.jpg'
    );

    const message = response.values?.content;

    if (message && message.trim()) {
      return await ItemService.sendUseItemRequest(this.code, undefined, message.trim());
    }
    return false;
  }
}