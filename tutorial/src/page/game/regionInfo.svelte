<script lang="ts">
  import { THEME } from '../../common/constant/theme';
  import { nowRegionInfo, nowRegionName } from '../../common/store/tutorialStore';
    import { tutorialStep } from '../../common/store/tutorialStreamStore';
    import TooltipOverlay from '../tutorialMessage/tooltipOverlay.svelte';
  

  export let turnInfo: string;
  let targetEl: HTMLElement

  let showAllMessages = false;
</script>


<!-- ✅ 상단 정보 + 최근 3개 메시지 -->
<div bind:this={targetEl} class={`${THEME.bgSecondary} ${THEME.textWhite} p-3 border-b ${THEME.borderPrimary}`}>
  <div class="flex justify-between items-center mb-1">
    <span class="text-sm font-semibold">현재 구역: {$nowRegionName}</span>
    <span class={`text-sm ${THEME.textWarning}`}>{turnInfo}</span>
  </div>
  <div class="text-xs space-y-0.5 cursor-pointer" on:click={() => showAllMessages = true}>
    {#each $nowRegionInfo.slice(0, 3) as message}
      <p class="truncate">• {message}</p>
    {/each}
    <p class={`text-right underline ${THEME.textAccent}`}>+ 전체 메세지 보기</p>
  </div>
</div>

{#if $tutorialStep===2}
  <TooltipOverlay {targetEl} message="여기는 현재 위치와 진행정보, 생존자들이 남긴 낙서 메시지를 읽을 수 있습니다. 클릭하면 전체 낙서도 볼 수 있습니다." />
{/if}



<!-- ✅ 모달로 전체 메시지 표시 -->
{#if showAllMessages}
  <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" on:click={() => showAllMessages = false}>
    <div class={`w-80 max-h-[80vh] overflow-y-auto p-4 ${THEME.bgTertiary} ${THEME.textWhite} ${THEME.roundedDefault}`} on:click|stopPropagation>
      <h2 class="text-lg font-bold mb-3">📝 구역 낙서 전체 보기</h2>
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
