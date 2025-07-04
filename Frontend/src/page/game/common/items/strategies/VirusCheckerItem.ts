import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class VirusCheckerItem extends BaseItemStrategy {
  name = '진단키트';
  info = '자신이 바이러스에 감염되었는지 확인합니다. 잠복기가 지나 좀비로 변이되면 사용할 수 없습니다';
  code: ItemInterface = 'virusChecker';
  
  async use(): Promise<boolean> {
    const confirmResponse = await showMessageBox(
      'confirm',
      '진단키트 사용',
      '진단키트를 사용하여 감염 여부를 확인하시겠습니까?\n\n※ 진단키트는 1회용입니다.',
      undefined,
      undefined,
      '/img/items/virusChecker.jpg'
    );

    if (!confirmResponse.success) {
      return false;
    }

    return await ItemService.sendUseItemRequest(this.code);
  }
}