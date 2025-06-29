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
  import GameStartMessageBox from './common/GameStartMessageBox.svelte'; // 🔥 새 컴포넌트 import
  import { 
    gamePhase,
    gameResult,
    syncWithServer,
    resetGameState,
    myStatus
  } from '../../common/store/gameStateStore';
  import { socketStore } from '../../common/store/socketStore';
  import { initMusic, cleanupMusic } from '../../common/store/musicStore'; // 🔥 toggleMusic 제거
    
  let showSurvivorModal = false;
  let hasShownRoleMessage = false;
  
  // 🔥 GameStartMessageBox 상태 관리
  let showRoleMessage = false;
  let roleMessageTitle = '';
  let roleMessageContent = '';
  let roleMessageImage = '';

  onMount(() => {
    // 배경음악 초기화
    initMusic('/game_bgm.mp3');

    // 소켓 이벤트 리스너 등록
    const socket = $socketStore;
    if (socket) {
      socket.on('update', (data) => {
        syncWithServer(data);
      });
    }
  });

  // myStatus가 설정되면 역할 안내 메시지 표시
  $: if ($myStatus && !hasShownRoleMessage) {
    hasShownRoleMessage = true;
    
    // 🔥 새로운 GameStartMessageBox 사용
    if ($myStatus.state === 'host') {
      roleMessageTitle = '당신은 숙주입니다!';
      roleMessageContent = '당신은 좀비 바이러스의 숙주입니다.\n\n' +
        '• 2 턴마다 같은 구역의 생존자 1명을 감염시킬 수 있습니다.\n' +
        '• 감염된 생존자는 5턴 후 좀비로 변이됩니다.\n' +
        '• 좀비를 조종하여 생존자를 공격할 수 있습니다.\n' +
        '• 정체를 들키지 않고 모든 생존자를 감염시키세요!\n\n' +
        '승리 조건: 모든 생존자를 감염 또는 사망시키면 승리합니다.';
      roleMessageImage = '/img/scence/host.png';
    } else {
      roleMessageTitle = '당신은 생존자입니다!';
      roleMessageContent = '당신은 좀비 바이러스로부터 살아남아야 하는 생존자입니다.\n\n' +
        '• 백신 재료 3종을 모아 백신을 제작하세요.\n' +
        '• 숙주를 찾아 백신을 투여하면 승리합니다.\n' +
        '• 진단키트로 감염 여부를 확인할 수 있습니다.\n' +
        '• 감염되었다면 응급치료제로 치료하세요.\n' +
        '• 다른 생존자와 협력하되, 누구도 믿지 마세요!\n\n' +
        '승리 조건: 숙주에게 백신을 투여하면 승리합니다.';
      roleMessageImage = '/img/scence/survivor.png';
    }
    
    showRoleMessage = true;
  }

  onDestroy(() => {
    // 배경음악 정리
    cleanupMusic();
    
    // 게임 페이지를 떠날 때 상태 초기화
    resetGameState();
  });

</script>
{#if $pageStore === 'game'}
<PlayerSelector/>
<SelectOptionBox/>

<!-- 🔥 게임 시작 메시지박스 -->
<GameStartMessageBox 
  isOpen={showRoleMessage}
  title={roleMessageTitle}
  message={roleMessageContent}
  imageSrc={roleMessageImage}
  onClose={() => showRoleMessage = false}
/>


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