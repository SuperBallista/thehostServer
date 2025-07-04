import { get } from 'svelte/store';
import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { selectPlayerMessageBox } from '../../../../../common/store/selectPlayerMessageBox';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import { otherPlayers, myStatus } from '../../../../../common/store/gameStateStore';
import { Survivor } from '../../../game.type';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class ShotgunItem extends BaseItemStrategy {
  name = '산탄총';
  info = '같은 지역에 있는 좀비로 변이된 플레이어를 사살할 수 있습니다';
  code: ItemInterface = 'shotgun';
  
  async use(): Promise<boolean> {
    // 같은 지역에 있는 좀비들 가져오기
    const allPlayers = get(otherPlayers);
    const myRegion = get(myStatus)?.region || 0;
    
    // 같은 지역의 좀비만 필터링
    const zombiesInSameRegion = Array.from(allPlayers.values())
      .filter(player => player.region === myRegion && player.state === 'zombie')
      .map(player => new Survivor(
        player.playerId,
        player.state,
        true // sameRegion
      ));

    if (zombiesInSameRegion.length === 0) {
      await showMessageBox(
        'error',
        '산탄총 사용 불가',
        '같은 구역에 좀비가 없습니다.'
      );
      return false;
    }

    const selectedZombie = await selectPlayerMessageBox(
      '좀비 사살',
      '사살할 좀비를 선택하세요.',
      zombiesInSameRegion,
      '/img/items/shotgun.jpg'
    );

    if (!selectedZombie) return false;

    // 사살 확인
    const confirmResponse = await showMessageBox(
      'confirm',
      '좀비 사살 확인',
      `${selectedZombie.nickname}를 사살하시겠습니까?\n\n※ 산탄총은 1회용입니다.`,
      undefined,
      undefined,
      '/img/items/shotgun.jpg'
    );

    if (!confirmResponse.success) {
      return false;
    }

    return await ItemService.sendUseItemRequest(this.code, selectedZombie.playerId);
  }
}