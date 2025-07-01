<script lang="ts">
  import { THEME } from '../../../common/constant/theme';
  import { socketStore } from '../../../common/store/socketStore';
  import { authStore } from '../../../common/store/authStore';
  import { playerId } from '../../../common/store/playerStore';
  import { nicknameList } from '../game.type';
  import { get } from 'svelte/store';
  import type { userRequest } from '../../../common/store/synchronize.type';

  let message = '';

  function sendMessage() {
    if (!message.trim()) return;

    const socket = get(socketStore);
    const token = get(authStore).token;
    const user = get(authStore).user;
    const currentPlayerId = get(playerId);

    if (!socket || !token || !user) return;

    const animalNickname = nicknameList[currentPlayerId];
    
    // 서버로 메시지 전송 (프론트에서 닉네임 포함)
    const requestData: userRequest = {
      token,
      user,
      chatMessage: {
        system: false,
        message: `${animalNickname} : ${message}`,
        timeStamp: new Date()
      }
    };

    socket.emit('request', requestData);

    // 입력 필드 초기화
    message = '';
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // 기본 동작 방지
      sendMessage();
    }
  }
</script>

<div class={`flex items-center p-2 border-t ${THEME.borderPrimary} ${THEME.bgSecondary}`} >

  <input
    bind:value={message}
    on:keydown={handleKeyDown}
    placeholder="메시지를 입력하세요..."
    class={`flex-1 mr-2 px-3 py-1 ${THEME.roundedDefault} ${THEME.bgDisabled} ${THEME.textWhite} focus:outline-none ${THEME.focusRing}`}
  />

  <button
    type="button"
    on:click={sendMessage}
    class={`px-4 py-1 ${THEME.bgAccent} ${THEME.textWhite} ${THEME.roundedDefault} hover:opacity-80 transition-opacity`}>
    전송
  </button>
</div>
