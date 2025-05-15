<script lang="ts">
    import { onMount } from 'svelte';
    import { currentRoom } from '../../common/store/pageStore';
    import { closeMessageBox, showMessageBox } from '../../common/messagebox/customStore';
    import { THEME } from '../../common/constant/theme';
    import PlayerCard from './playerCard.svelte';
    import { awaitSocketReady } from '../../common/utils/awaitSocketReady';
  
    onMount(async () => {
      showMessageBox('loading', '방 정보 열기', '방 정보를 서버로부터 가져옵니다');
      closeMessageBox();
    });


    async function leaveRoom() {
    // 메시지 박스 보여주고 이후 라우팅 또는 상태 초기화 처리
    showMessageBox('loading', '방 나가기', '로비로 이동 중입니다...');
    const socket = await awaitSocketReady();
    socket.emit('location:update', {
  state: 'lobby',
  roomId: null,
});    
    closeMessageBox();
}

async function startGame() {
  showMessageBox('loading', '게임 시작', '게임을 시작합니다...');

  // TODO: 서버에 게임 시작 요청 보내기
  // 예: socket.emit('room:start', { roomId: $currentRoom.id });

  closeMessageBox();
}



  </script>
  
  <!-- ✅ 전체 레이아웃: 어두운 배경 + 중앙 정렬 -->
  <div class={`min-h-screen flex items-center justify-center ${THEME.bgSecondary}`}>
    <div class={`w-full max-w-md p-6 m-4
                  border ${THEME.borderPrimary}
                  ${THEME.roundedDefault}
                  ${THEME.shadow}
                  ${THEME.bgTertiary}
                  ${THEME.textPrimary}`}>
  
      <h2 class={`text-xl font-bold mb-4 ${THEME.textWhite}`}>
        🧾 대기실 - {$currentRoom?.name || '이름 없음'}
      </h2>
  
      <p class="mb-2">
        <span class={`${THEME.textSecondary} font-semibold`}>방 ID:</span>
        <span class={`${THEME.textWhite} ml-2`}>{$currentRoom?.id}</span>
      </p>
  
      <p class="mb-4">
        <span class={`${THEME.textSecondary} font-semibold`}>참가자 수:</span>
        <span class={`${THEME.textWhite} ml-2`}>{$currentRoom?.players.length}명</span>
      </p>

      <div class="mt-4 text-center flex justify-evenly">
  <button
    on:click={startGame}
    class={`px-4 py-2 ${THEME.bgPrimary} text-white font-semibold rounded-lg shadow-md transition`}
  >
    🚀 게임 시작
  </button>
  <button
    on:click={leaveRoom}
    class={`px-4 py-2 ${THEME.bgSecondary} text-white font-semibold rounded-lg shadow-md transition`}
  >
    🔙 방 나가기
  </button>
</div>
  
<!-- 카드 영역 -->
<div class="mt-6">
    <h3 class={`mb-2 text-lg font-bold ${THEME.textAccentStrong}`}>참가자 목록</h3>
    <div class="flex flex-wrap justify-start">
      {#each $currentRoom?.players || [] as player}
        <PlayerCard nickname={player.nickname} />
      {/each}
    </div>
  </div>

      {#if !$currentRoom}
        <div class={`mt-6 text-center ${THEME.textWarning}`}>
          방 정보를 불러올 수 없습니다.
        </div>
      {/if}
    </div>
  </div>
  
