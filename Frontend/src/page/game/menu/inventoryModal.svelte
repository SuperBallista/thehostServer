<script lang="ts">
    import { THEME } from "../../../common/constant/theme";

    let isOpen = false
    let itemList = [{name: ' '}]
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div class="bg-gray-800 p-4 rounded-lg w-3/4 max-w-md shadow-md">
      <h2 class="text-lg text-red-400 mb-4">🎒 가방</h2>
      <div class="space-y-2">
        {#each itemList as item}
          <div class="flex items-center justify-between bg-gray-700 p-2 rounded">
            <div class="text-white font-medium">{item.name}</div>
            <div class="flex gap-1">
              <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`} >안내</button>
              <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgWarning}`} >사용</button>
              <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`} >주기</button>
            </div>
          </div>
        {/each}
      </div>
      <button class={`mt-6 px-4 py-2 text-white rounded w-full ${THEME.bgSecondary}`}>
        닫기
      </button>
    </div>
  </div>
{/if}
