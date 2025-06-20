<script lang="ts">
import { THEME } from '../../../common/constant/theme';
import { 
  myStatus,
  gameTurn,
  turnTimer,
  regionNames,
  regionMessages,
  totalRegions
} from '../../../stores/gameStateStore';
  
  let targetEl: HTMLElement
  let showAllMessages = false;

  // 현재 구역 이름 계산
  $: nowRegionName = $myStatus && $regionNames[$myStatus.region] ? $regionNames[$myStatus.region] : '알 수 없음';
  
  // 현재 구역의 메시지 필터링
  $: nowRegionInfo = $regionMessages
    .filter(msg => msg.region === $myStatus?.region)
    .map(msg => msg.isErased ? '지워진 낙서' : msg.message);

  // 디폴트 메시지가 없으면 빈 배열 대신 안내 문구
  $: if (nowRegionInfo.length === 0) {
    nowRegionInfo = ['아직 낙서가 없습니다.'];
  }
</script>


<!-- ✅ 상단 정보 + 최근 3개 메시지 -->
<div bind:this={targetEl} class={`${THEME.bgSecondary} ${THEME.textPrimary} p-3 border-b ${THEME.borderPrimary}`}>
    {#if $myStatus}
      <span class={`text-lg font-bold ${THEME.textAccent}`}>
        {$myStatus.nickname} - 
        {#if $myStatus.state === 'you'}
          생존자
        {:else if $myStatus.state === 'host'}
          숙주
        {:else if $myStatus.state === 'zombie'}
          좀비
        {:else if $myStatus.state === 'infected'}
          감염자
        {:else if $myStatus.state === 'dead'}
          사망
        {:else}
          생존자
        {/if}
      </span>
    {/if}
  <div class="flex justify-between items-center mb-1">
    <span class="text-md font-semibold">현재 구역: {nowRegionName}</span>
    <span class={`text-md ${THEME.textPrimary}`}><span class={THEME.textAccent}>{$gameTurn}</span>턴 진행중 <span class={THEME.textWarning}>{$turnTimer}</span>초 남음</span>
  </div>
  <div class="text-sm space-y-0.5 cursor-pointer" on:click={() => showAllMessages = true}>
    {#each nowRegionInfo.slice(0, 3) as message}
      <p class={`truncate ${message === '지워진 낙서' ? THEME.textTertiary : null}`}>• {message}</p>
    {/each}

    <p class={`text-right underline ${THEME.textAccent}`}>+ 전체 메세지 보기</p>
  </div>
</div>

<!-- ✅ 모달로 전체 메시지 표시 -->
{#if showAllMessages}
  <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" on:click={() => showAllMessages = false}>
    <div class={`w-80 max-h-[80vh] overflow-y-auto p-4 ${THEME.bgTertiary} ${THEME.textWhite} ${THEME.roundedDefault}`} on:click|stopPropagation>
      <h2 class="text-lg font-bold mb-3">📝 구역 낙서 전체 보기</h2>
      <ul class="space-y-1 text-md">
        {#each nowRegionInfo as msg}
          <li class={`break-words whitespace-pre-wrap ${msg === '지워진 낙서' ? THEME.textTertiary : null}`}>• {msg}</li>
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
