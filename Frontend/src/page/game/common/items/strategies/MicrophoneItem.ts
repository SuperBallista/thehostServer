import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class MicrophoneItem extends BaseItemStrategy {
  name = '마이크';
  info = '모든 지역에 있는 생존자들에게 메시지를 방송할 수 있습니다';
  code: ItemInterface = 'microphone';
  
  async use(): Promise<boolean> {
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
      return await ItemService.sendUseItemRequest(this.code, undefined, message.trim());
    }
    return false;
  }
}