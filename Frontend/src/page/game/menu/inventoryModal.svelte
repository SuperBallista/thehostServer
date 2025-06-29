<script lang="ts">
    import { THEME } from "../../../common/constant/theme";
    import { myStatus } from '../../../common/store/gameStateStore';
    import type { ItemInterface } from '../../../common/store/synchronize.type';
    import { itemList } from '../common/itemObject';
    import { showMessageBox } from '../../../common/messagebox/customStore';

    export let isOpen = false;

    let selectedItem: ItemInterface | undefined ;
    let showDescription = false;

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
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div class="bg-gray-800 p-4 rounded-lg w-3/4 max-w-md shadow-md">
      <h2 class="text-lg text-purple-400 mb-4">🎒 가방</h2>
      
      {#if showDescription && selectedItem}
        <div class="mb-4 p-3 bg-gray-700 rounded">
          <h3 class="text-white font-bold">{itemList[selectedItem].name}</h3>
          <p class="text-gray-300 text-sm mt-1">{itemList[selectedItem].info}</p>
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
              <div class="text-white font-medium">{itemList[item].name}</div>
              <div class="flex gap-1">
                <button 
                  class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`}
                  on:click={() => showItemInfo(item)}
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
