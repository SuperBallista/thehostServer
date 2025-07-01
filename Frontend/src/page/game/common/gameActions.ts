import { get } from 'svelte/store';
import { socketStore } from '../../../common/store/socketStore';
import { authStore } from '../../../common/store/authStore';
import { showMessageBox } from '../../../common/messagebox/customStore';
import type { userRequest } from '../../../common/store/synchronize.type';

/**
 * 게임 나가기 처리
 */
export async function exitGame() {
  const response = await showMessageBox(
    'confirm',
    '게임 나가기',
    '정말로 게임을 나가시겠습니까?\n게임을 나가면 다시 참여할 수 없습니다.'
  );

  if (!response.success) return;

  const socket = get(socketStore);
  const authData = get(authStore);
  
  if (!socket || !authData.token || !authData.user) {
    console.error('소켓 또는 인증 정보가 없습니다');
    return;
  }
  
  const requestData: userRequest = {
    token: authData.token,
    user: authData.user,
    exitRoom: true
  };
  
  socket.emit('request', requestData);
  console.log('게임 나가기 요청 전송');
}