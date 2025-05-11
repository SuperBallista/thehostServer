<script lang="ts">
  import { THEME } from '../../common/constant/theme';
  import { nowRegionInfo } from '../../common/store/tutorialStore';

  export let regionName: string = '폐건물';
  export let turnInfo: string = '45초 남음';

  let showAllMessages = false;
</script>

<!-- ✅ 상단 정보 + 최근 3개 메시지 -->
<div class={`${THEME.bgSecondary} ${THEME.textWhite} p-3 border-b ${THEME.borderPrimary}`}>
  <div class="flex justify-between items-center mb-1">
    <span class="text-sm font-semibold">현재 구역: {regionName}</span>
    <span class={`text-sm ${THEME.textWarning}`}>{turnInfo}</span>
  </div>
  <div class="text-xs space-y-0.5 cursor-pointer" on:click={() => showAllMessages = true}>
    {#each $nowRegionInfo.slice(0, 3) as message}
      <p class="truncate">• {message}</p>
    {/each}
    <p class={`text-right underline ${THEME.textAccent}`}>+ 전체 메세지 보기</p>
  </div>
</div>

<!-- ✅ 모달로 전체 메시지 표시 -->
{#if showAllMessages}
  <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" on:click={() => showAllMessages = false}>
    <div class={`w-80 max-h-[80vh] overflow-y-auto p-4 ${THEME.bgTertiary} ${THEME.textWhite} ${THEME.roundedDefault}`} on:click|stopPropagation>
      <h2 class="text-lg font-bold mb-3">📝 지역 낙서 전체 보기</h2>
      <ul class="space-y-1 text-sm">
        {#each $nowRegionInfo as msg}
          <li class="leading-snug">• {msg}</li>
        {/each}
      </ul>
      <button
        class={`mt-4 w-full py-2 ${THEME.bgDisabled} ${THEME.textWhite} ${THEME.roundedDefault}`}
        on:click={() => showAllMessages = false}
      >
        닫기
      </button>
    </div>
  </div>
{/if}
