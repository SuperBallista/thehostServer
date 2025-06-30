<script lang="ts">
    import { THEME } from "../../../common/constant/theme";
    import { showSelectOptionBox } from "../../../common/store/selectOptionStore";
    import { myStatus, isHost, canInfect, zombies } from '../../../common/store/gameStateStore';
    import type { ItemInterface } from '../../../common/store/synchronize.type';
    import { itemList } from '../common/itemObject';
    import { showMessageBox } from '../../../common/messagebox/customStore';
    import { musicStore, toggleMusic } from '../../../common/store/musicStore';

  let inventory:HTMLElement
  let action:HTMLElement
  let skip:HTMLElement
  

  let openSection: 'inventory' | 'action' | null = null;
  const toggle = (section: typeof openSection) => {
    openSection = openSection === section ? null : section;
  };

  function showItemInfo(item: ItemInterface) {
    showMessageBox(
      'tips',
      itemList[item].name,
      itemList[item].info,
      undefined,
      undefined,
      `/img/items/${item}.jpg`
    );
  }



async function moveNextRegion() {
 await showSelectOptionBox(
  '이동지역 선택',
  '다음 지역은 어디로 이동하시겠습니까?',
  [
    { value: 'a', label: '언덕' },
    { value: 'b', label: '폐건물' },
    { value: 'c', label: '정글' },
    { value: 'd', label: '해안가' },
    { value: 'e', label: '동굴' },
    { value: 'f', label: '개울' }
  ]
);
}

</script>

<div class="flex flex-col gap-y-2">
  <!-- 🎒 가방 -->
  <div bind:this={inventory}>
    <button class="w-full text-left px-4 py-2 font-semibold" on:click={() => toggle('inventory')}>🎒 가방</button>
    {#if openSection === 'inventory'}
      <div class="pl-6 mt-1 space-y-1 text-sm flex flex-col">
        {#if $myStatus?.items && $myStatus.items.length > 0}
          {#each $myStatus.items as item}
            <div class="flex items-center justify-between bg-gray-700 p-2 rounded">
              <div class="text-white font-medium">{itemList[item].name}</div>
              <div class="flex gap-1">
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`} on:click={() => showItemInfo(item)}>안내</button>
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgAccent}`}>사용</button>
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`}>주기</button>
              </div>
            </div>
          {/each}
        {:else}
          <p class="text-gray-400 text-center py-2">아이템이 없습니다.</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 🧭 행동 -->
  <div>
    <button bind:this={action} class="w-full text-left px-4 py-2 font-semibold" on:click={() => toggle('action')}>🧭 행동</button>
      <div class="pl-6 mt-1 space-y-1 text-sm flex flex-col">
        <button on:click={() => moveNextRegion()} class={`block w-full py-2 rounded ${THEME.bgAccent}`}>다음 턴 이동 장소 설정</button>
          <button class={`block w-full py-2 rounded ${THEME.bgDisabled}`}>좀비 대처 행동</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $canInfect ? THEME.bgAccent : THEME.bgDisabled}`}
            disabled={!$isHost || !$canInfect}
          >감염시키기(숙주 전용)</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $zombies.length > 0 ? THEME.bgAccent : THEME.bgDisabled}`}
            disabled={!$isHost || $zombies.length === 0}
          >좀비의 공격 대상 정하기(숙주 전용)</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $zombies.length > 0 ? THEME.bgAccent : THEME.bgDisabled}`}
            disabled={!$isHost || $zombies.length === 0}
          >좀비의 이동 구역 정하기(숙주 전용)</button>
      </div>
  <!-- ⏭️ 넘기기 -->
  <div bind:this={skip} class="mt-4">

    <button class="w-full text-left px-4 py-2 font-semibold">
      ⏭️ 넘기기
    </button>
      <button class="w-full ${THEME.textAccent} text-left px-4 py-2 font-semibold">🚪 나가기</button>
      
      <!-- 음악 토글 버튼 -->
      <button 
        class={`w-full text-left px-4 py-2 font-semibold ${$musicStore.isPlaying ? THEME.textAccent : THEME.textSecondary}`}
        on:click={toggleMusic}
      >
        {$musicStore.isPlaying ? '🔊' : '🔇'} 배경음악 {$musicStore.isPlaying ? 'ON' : 'OFF'}
      </button>
</div>
</div>
</div>