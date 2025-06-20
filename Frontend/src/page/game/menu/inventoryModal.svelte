<script lang="ts">
    import { THEME } from "../../../common/constant/theme";
    import { myStatus } from '../../../common/store/gameStateStore';
    import type { ItemInterface } from '../../../common/store/synchronize.type';

    export let isOpen = false;

    // 아이템 한글 이름 매핑
    const itemNames: Record<ItemInterface, string> = {
      spray: '낙서 스프레이',
      virusChecker: '자가진단키트',
      vaccine: '백신',
      medicine: '응급치료제',
      vaccineMaterialA: '백신 재료 A',
      vaccineMaterialB: '백신 재료 B', 
      vaccineMaterialC: '백신 재료 C',
      wireless: '무전기',
      eraser: '지우개'
    };

    // 아이템 설명
    const itemDescriptions: Record<ItemInterface, string> = {
      spray: '구역에 익명 메시지를 남길 수 있습니다.',
      virusChecker: '대상의 감염 여부를 확인할 수 있습니다.',
      vaccine: '숙주에게 사용하면 게임에서 승리합니다.',
      medicine: '감염자를 치료할 수 있습니다.',
      vaccineMaterialA: '백신 제작에 필요한 재료입니다.',
      vaccineMaterialB: '백신 제작에 필요한 재료입니다.',
      vaccineMaterialC: '백신 제작에 필요한 재료입니다.',
      wireless: '다른 플레이어와 1:1 통신을 할 수 있습니다.',
      eraser: '구역의 낙서를 지울 수 있습니다.'
    };

    let selectedItem: ItemInterface | null = null;
    let showDescription = false;
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div class="bg-gray-800 p-4 rounded-lg w-3/4 max-w-md shadow-md">
      <h2 class="text-lg text-purple-400 mb-4">🎒 가방</h2>
      
      {#if showDescription && selectedItem}
        <div class="mb-4 p-3 bg-gray-700 rounded">
          <h3 class="text-white font-bold">{itemNames[selectedItem]}</h3>
          <p class="text-gray-300 text-sm mt-1">{itemDescriptions[selectedItem]}</p>
          <button 
            class="mt-2 text-sm text-blue-400 underline"
            on:click={() => showDescription = false}
          >
            닫기
          </button>
        </div>
      {/if}

      <div class="space-y-2">
        {#if $myStatus?.items && $myStatus.items.length > 0}
          {#each $myStatus.items as item}
            <div class="flex items-center justify-between bg-gray-700 p-2 rounded">
              <div class="text-white font-medium">{itemNames[item]}</div>
              <div class="flex gap-1">
                <button 
                  class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`}
                  on:click={() => {
                    selectedItem = item;
                    showDescription = true;
                  }}
                >
                  안내
                </button>
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgAccent}`}>사용</button>
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`}>주기</button>
              </div>
            </div>
          {/each}
        {:else}
          <p class="text-gray-400 text-center py-4">아이템이 없습니다.</p>
        {/if}
      </div>
      <button 
        class={`mt-6 px-4 py-2 text-white rounded w-full ${THEME.bgSecondary}`}
        on:click={() => isOpen = false}
      >
        닫기
      </button>
    </div>
  </div>
{/if}
