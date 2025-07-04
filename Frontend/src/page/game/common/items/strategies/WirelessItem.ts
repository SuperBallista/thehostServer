import { get } from 'svelte/store';
import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';
import { selectPlayerMessageBox } from '../../../../../common/store/selectPlayerMessageBox';
import { showMessageBox } from '../../../../../common/messagebox/customStore';
import { otherPlayers, myStatus } from '../../../../../common/store/gameStateStore';
import { Survivor } from '../../../game.type';
import type { ItemInterface } from '../../../../../common/store/synchronize.type';

export class WirelessItem extends BaseItemStrategy {
  name = '무전기';
  info = '다른 구역에 있는 생존자에게 무전을 보낼 수 있습니다';
  code: ItemInterface = 'wireless';
  
  async use(): Promise<boolean> {
    // 다른 지역에 있는 생존자들 중에서 선택
    const allSurvivors = get(otherPlayers);
    const myRegion = get(myStatus)?.region || 0;
    
    // 다른 지역에 있는 생존자들만 필터링
    const playersInOtherRegions = Array.from(allSurvivors.values())
      .filter(player => player.region !== myRegion && player.state === 'alive')
      .map(player => new Survivor(
        player.playerId,
        player.state,
        false // sameRegion = false (다른 지역에 있음)
      ));

    if (playersInOtherRegions.length === 0) {
      await showMessageBox(
        'error',
        '무전기 사용 불가',
        '다른 지역에 있는 생존자가 없습니다.'
      );
      return false;
    }

    const selectedPlayer = await selectPlayerMessageBox(
      '무전기 사용',
      '무전을 보낼 생존자를 선택하세요.',
      playersInOtherRegions,
      '/img/items/wireless.jpg'
    );

    if (!selectedPlayer) return false;

    const message = (await showMessageBox(
      'input',
      '무전 메시지',
      '무전으로 보낼 메시지를 입력하세요',
      undefined,
      [
        {
          key: 'content',
          label: '',
          type: 'text',
          placeholder: '무전 메시지를 입력하세요'
        }
      ],
      '/img/items/wireless.jpg'
    )).values?.content;

    if (message && message.trim()) {
      return await ItemService.sendUseItemRequest(this.code, selectedPlayer.playerId, message.trim());
    }
    return false;
  }
}