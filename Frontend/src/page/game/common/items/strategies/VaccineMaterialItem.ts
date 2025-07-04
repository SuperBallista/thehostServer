import { get } from 'svelte/store';
import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import { playerItems } from '../../../../../common/store/playerStore';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

/**
 * Base class for vaccine material items (A, B, C)
 */
export abstract class VaccineMaterialItem extends BaseItemStrategy {
  abstract materialType: 'A' | 'B' | 'C';
  
  get name(): string {
    const materialNames: Record<string, string> = {
      vaccineMaterialA: '항바이러스혈청',
      vaccineMaterialB: '촉매정제물질',
      vaccineMaterialC: '신경억제단백질'
    };
    return materialNames[this.code] || '백신 재료';
  }
  
  info = '백신을 만드는 재료입니다. 항바이러스혈청, 촉매정제물질, 신경억제단백질을 모두 모으면 백신을 만들 수 있습니다';
  
  async use(): Promise<boolean> {
    const items = get(playerItems);
    
    // 필요한 재료들
    const requiredMaterials: ItemInterface[] = ['vaccineMaterialA', 'vaccineMaterialB', 'vaccineMaterialC'];
    
    // 보유한 재료 확인
    const hasMaterials = requiredMaterials.filter(material => items.includes(material));
    const missingMaterials = requiredMaterials.filter(material => !items.includes(material));
    
    if (missingMaterials.length === 0) {
      // 모든 재료를 가지고 있을 때
      const confirmResponse = await showMessageBox(
        'confirm',
        '백신 제작',
        '모든 재료를 보유하고 있습니다.\n백신을 제작하시겠습니까?\n\n※ 모든 재료가 소모됩니다.',
        undefined,
        undefined,
        '/img/items/vaccine.jpg'
      );

      if (!confirmResponse.success) {
        return false;
      }

      return await ItemService.sendUseItemRequest(this.code);
    } else {
      // 재료가 부족할 때
      const materialNames: Record<string, string> = {
        vaccineMaterialA: '항바이러스혈청',
        vaccineMaterialB: '촉매정제물질',
        vaccineMaterialC: '신경억제단백질'
      };
      
      const hasNames = hasMaterials.map(m => materialNames[m]).join(', ');
      const missingNames = missingMaterials.map(m => materialNames[m]).join(', ');
      
      await showMessageBox(
        'alert',
        '백신 재료 부족',
        `백신을 만들기 위한 재료가 부족합니다.\n\n보유한 재료: ${hasNames}\n부족한 재료: ${missingNames}`
      );
      return false;
    }
  }
}

// Concrete implementations for each material type
export class VaccineMaterialAItem extends VaccineMaterialItem {
  materialType: 'A' | 'B' | 'C' = 'A';
  code: ItemInterface = 'vaccineMaterialA';
}

export class VaccineMaterialBItem extends VaccineMaterialItem {
  materialType: 'A' | 'B' | 'C' = 'B';
  code: ItemInterface = 'vaccineMaterialB';
}

export class VaccineMaterialCItem extends VaccineMaterialItem {
  materialType: 'A' | 'B' | 'C' = 'C';
  code: ItemInterface = 'vaccineMaterialC';
}