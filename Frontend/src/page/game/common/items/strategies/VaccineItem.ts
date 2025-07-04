import { get } from 'svelte/store';
import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { selectPlayerMessageBox } from '../../../../../common/store/selectPlayerMessageBox';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import { otherPlayers, myStatus } from '../../../../../common/store/gameStateStore';
import { Survivor } from '../../../game.type';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class VaccineItem extends BaseItemStrategy {
  name = '백신';
  info = '생존자 중에 섞여있는 좀비 숙주에게 이 아이템을 사용하면 승리합니다';
  code: ItemInterface = 'vaccine';
  
  async use(): Promise<boolean> {
    // 같은 지역에 있는 다른 생존자들 가져오기
    const allSurvivors = get(otherPlayers);
    const myRegion = get(myStatus)?.region || 0;
    
    const playersInSameRegion = Array.from(allSurvivors.values())
      .filter(player => player.region === myRegion && player.state === 'alive')
      .map(player => new Survivor(
        player.playerId,
        player.state,
        true // sameRegion
      ));

    if (playersInSameRegion.length === 0) {
      await showMessageBox(
        'error',
        '백신 사용 불가',
        '같은 구역에 다른 생존자가 없습니다.'
      );
      return false;
    }

    const selectedPlayer = await selectPlayerMessageBox(
      '백신 투여',
      '백신을 투여할 대상을 선택하세요.',
      playersInSameRegion,
      '/img/items/vaccine.jpg'
    );

    if (!selectedPlayer) return false;

    // 백신 사용 확인
    const confirmResponse = await showMessageBox(
      'confirm',
      '백신 투여 확인',
      `${selectedPlayer.nickname}에게 백신을 투여하시겠습니까?\n\n※ 숙주가 맞다면 게임에서 승리합니다.\n※ 일반 생존자라면 아무 효과가 없습니다.`,
      undefined,
      undefined,
      '/img/items/vaccine.jpg'
    );

    if (!confirmResponse.success) {
      return false;
    }

    return await ItemService.sendUseItemRequest(this.code, selectedPlayer.playerId);
  }
}