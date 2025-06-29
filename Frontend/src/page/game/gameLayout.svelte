<script lang="ts">
  import RegionInfo from './chat/regionInfo.svelte';
  import SurvivorModal from './menu/survivorModal.svelte';
  import ChatLog from './chat/chatLog.svelte';
  import ChatInput from './chat/chatInput.svelte';
  import { THEME } from '../../common/constant/theme';
  import GameMenu from './gameMenu.svelte';
  import PlayerSelector from './selectModal/playerSelector.svelte';
  import SelectOptionBox from './selectModal/selectOptionBox.svelte';
  import { pageStore } from '../../common/store/pageStore';
  import { onMount, onDestroy } from 'svelte';
  import { 
    gamePhase,
    gameResult,
    syncWithServer,
    resetGameState
  } from '../../common/store/gameStateStore';
  import { socketStore } from '../../common/store/socketStore';
    
  let showSurvivorModal = false;

  onMount(() => {
    // 소켓 이벤트 리스너 등록
    const socket = $socketStore;
    if (socket) {
      socket.on('update', (data) => {
        syncWithServer(data);
      });
    }
  });

  onDestroy(() => {
    // 게임 페이지를 떠날 때 상태 초기화
    resetGameState();
  });

</script>
{#if $pageStore === 'game'}
<PlayerSelector/>
<SelectOptionBox/>


<!-- 게임 종료 모달 -->
{#if $gamePhase === 'ended' && $gameResult}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg shadow-xl">
      <h2 class="text-2xl font-bold mb-4">게임 종료!</h2>
      <p class="text-lg">
        {#if $gameResult === 'cure'}
          🎉 생존자 승리! 백신을 성공적으로 투여했습니다.
        {:else if $gameResult === 'infected'}
          🧟 좀비 승리! 모든 생존자가 감염되었습니다.
        {:else if $gameResult === 'killed'}
          💀 좀비 승리! 모든 생존자가 사망했습니다.
        {/if}
      </p>
      <button class="mt-4 px-4 py-2 bg-blue-500 text-white rounded" on:click={() => pageStore.set('lobby')}>
        로비로 돌아가기
      </button>
    </div>
  </div>
{/if}

<div class={`flex flex-col md:flex-row min-h-screen px-6 py-4 gap-x-6 ${THEME.bgSecondary} ${THEME.textPrimary}`}>


    <SurvivorModal alwaysVisible={true}/>
    <SurvivorModal isOpen={showSurvivorModal} onClose={() => showSurvivorModal = false}/>


    

  <!-- 중앙 채팅 영역 -->
  <main class="flex-1 flex flex-col gap-y-4 pb-14">
      <RegionInfo/>
      <ChatLog/>
      <ChatInput />
      </main>

          <!-- 데스크탑이면 왼쪽 사이드, 모바일이면 하단 고정 -->
    <GameMenu/>

</div>

<style>
  .chat-log {
    max-height: calc(100vh - 200px);
  }
</style>
{/if}