<script lang="ts">
  import { THEME } from '../../common/constant/theme';
  import InventoryModal from './inventoryModal.svelte';
  import ActionModal from './actionModal.svelte';

  let showInventory = false;
  let showActionMenu = false;

  function closeModals() {
    showInventory = false;
    showActionMenu = false;
  }

  let inputMessage = '';
  let messages = [
    { content: '[말많은다람쥐] 아까 족제비가 폐건물에 좀비가 있다고 했어', system: false },
    { content: '[고집센너구리] 헐.... 폐건물 조심해 다들.', system: false },
  ];

  function scrollToBottom() {
    // optional: 자동 스크롤 기능 구현
    setTimeout(() => {
      const container = document.querySelector('.overflow-y-auto');
      container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, 10);
  }
</script>

<div class={`items-center justify-start flex flex-col min-h-screen p-6 ${THEME.bgSecondary} ${THEME.textPrimary} ${THEME.transition}`}>

  <!-- 상단 공지 -->
  <div class={`p-2 text-sm text-center ${THEME.bgAccent} ${THEME.textWhite}`}>
   해안가 45초 남음
  </div>

<!-- 채팅 로그 -->
<div class="flex-1 overflow-y-auto p-4 space-y-2">
  {#each messages as msg}
    <div class={msg.system ? THEME.textAccent : THEME.textPrimary}>
      {msg.content}
    </div>
  {/each}
</div>

<!-- 메시지 입력창 -->
<div class="flex items-center p-2 border-t border-gray-700">
  <input
    bind:value={inputMessage}
    class="flex-1 mr-2 px-3 py-1 rounded-md bg-gray-700 text-white focus:outline-none"
    placeholder="메시지를 입력하세요..."
  />
  <button
    type="submit"
    class={`px-4 py-1 ${THEME.bgAccentPrimary} ${THEME.textWhite} ${THEME.roundedDefault}`}
  >
    전송
  </button>
</div>

  <!-- 하단 버튼 영역 -->
  <div class="flex justify-around p-4 border-t border-gray-700">
    <button
      class={`px-4 py-2 ${THEME.bgAccent} ${THEME.textWhite} ${THEME.roundedDefault} ${THEME.shadow}`}
      on:click={() => {
        closeModals();
        showInventory = true;
      }}
    >
      🎒 가방
    </button>
    <button
      class={`px-4 py-2 ${THEME.bgAccentPrimary} ${THEME.textWhite} ${THEME.roundedDefault} ${THEME.shadow}`}
      on:click={() => {
        closeModals();
        showActionMenu = true;
      }}
    >
      🧭 행동
    </button>
  </div>

  <!-- 모달 창 -->
  {#if showInventory}
    <InventoryModal on:close={() => (showInventory = false)} />
  {/if}
  {#if showActionMenu}
    <ActionModal on:close={() => (showActionMenu = false)} />
  {/if}

  <!-- 하단 푸터 -->
  <footer class="text-xs text-center mt-4 mb-2">
    <p class={`${THEME.textTertiary}`}>© 2025 The Host. All rights reserved.</p>
  </footer>
</div>
