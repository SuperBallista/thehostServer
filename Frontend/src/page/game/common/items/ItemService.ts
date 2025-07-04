import { get } from 'svelte/store';
import { socketStore } from '../../../../common/store/socketStore';
import { authStore } from '../../../../common/store/authStore';
import { currentRoom } from '../../../../common/store/pageStore';
import { playerId } from '../../../../common/store/playerStore';
import type { userRequest, ItemInterface } from '../../../../common/store/synchronize.type';

/**
 * Service class for handling item-related operations
 */
export class ItemService {
  /**
   * Send item usage request to server
   */
  static async sendUseItemRequest(
    item: ItemInterface, 
    targetPlayer?: number, 
    content?: string, 
    targetMessage?: number
  ): Promise<boolean> {
    const socket = get(socketStore);
    const authData = get(authStore);
    const room = get(currentRoom);
    const currentPlayerId = get(playerId);
    
    if (!socket || !authData.token || !authData.user || !room?.id) {
      console.error('소켓 또는 인증 정보가 없습니다');
      return false;
    }

    const requestData: userRequest = {
      token: authData.token,
      user: authData.user,
      useItem: {
        item,
        targetPlayer,
        content,
        targetMessage,
        playerId: currentPlayerId
      },
      roomId: room.id
    };

    socket.emit('request', requestData);
    console.log('아이템 사용 요청 전송:', requestData);
    return true;
  }
}