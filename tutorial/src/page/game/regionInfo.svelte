<script lang="ts">
  import { THEME } from '../../common/constant/theme';

  export let regionName: string = '폐건물';
  export let turnInfo: string = '45초 남음';
  export let recentMessages: string[] = [
    '추리좀 하게 낙서 좀 지우지 마라... 누가 지우고 다니냐ㅡㅡ',
    '지워진 낙서',
    '늑대가 12턴째 해안가에서 좀비한테 죽었대',
    '10턴째 수달이 여기서 좀비됨',
    '지워진 낙서',
    '엥 2번째 낙서 가짜 정보 같은데....',
    '까마귀 좀 수상하지 않아? - 토끼가',
    '지워진 낙서',
    '나 여기에서 진단키트 써봤는데 그새 감염됬더라.... - 고슴도치가',
  ];

  let showAllMessages = false;
</script>

<!-- ✅ 상단 정보 + 최근 3개 메시지 -->
<div class={`${THEME.bgSecondary} ${THEME.textWhite} p-3 border-b ${THEME.borderPrimary}`}>
  <div class="flex justify-between items-center mb-1">
    <span class="text-sm font-semibold">현재 구역: {regionName}</span>
    <span class={`text-sm ${THEME.textWarning}`}>{turnInfo}</span>
  </div>
  <div class="text-xs space-y-0.5 cursor-pointer" on:click={() => showAllMessages = true}>
    {#each recentMessages.slice(0, 3) as message}
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
        {#each recentMessages as msg}
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
