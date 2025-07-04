import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class MedicineItem extends BaseItemStrategy {
  name = '응급치료제';
  info = '자신이 감염되어 잠복기 상태일 때 감염을 치료할 수 있습니다';
  code: ItemInterface = 'medicine';
  
  async use(): Promise<boolean> {
    const confirmResponse = await showMessageBox(
      'confirm',
      '응급치료제 사용',
      '응급치료제를 사용하시겠습니까?\n\n※ 감염되어 있다면 치료됩니다.\n※ 감염되지 않았어도 소모됩니다.',
      undefined,
      undefined,
      '/img/items/medicine.jpg'
    );

    if (!confirmResponse.success) {
      return false;
    }

    return await ItemService.sendUseItemRequest(this.code);
  }
}